import sqlite3
import json
import logging
import time
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class EdgeSQLiteBuffer:
    """
    Store-and-Forward local buffer for Jetson Edge AI devices.
    Prevents data loss during 4G/5G cellular dead zones.
    """
    def __init__(self, db_path: str = "edge_event_buffer.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS event_buffer (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_uuid TEXT UNIQUE NOT NULL,
                    payload_json TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    retry_count INTEGER DEFAULT 0
                )
            """)
            conn.commit()

    def buffer_event(self, event_uuid: str, payload: Dict[str, Any]):
        """Buffers an unsent detection event into local SQLite storage."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR IGNORE INTO event_buffer (event_uuid, payload_json, created_at) VALUES (?, ?, ?)",
                (event_uuid, json.dumps(payload), time.time())
            )
            conn.commit()
            logger.info(f"[EdgeBuffer] Event {event_uuid} buffered locally.")

    def get_pending_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves pending events from buffer queue."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, event_uuid, payload_json FROM event_buffer ORDER BY id ASC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [{"db_id": r[0], "event_uuid": r[1], "payload": json.loads(r[2])} for r in rows]

    def remove_buffered_event(self, db_id: int):
        """Deletes successfully transmitted event from buffer."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM event_buffer WHERE id = ?", (db_id,))
            conn.commit()

    def drain_buffer(self, api_base_url: str) -> int:
        """
        Attempts to transmit buffered events to central API backend.
        Returns the number of successfully transmitted events.
        """
        pending = self.get_pending_events(limit=50)
        if not pending:
            return 0

        success_count = 0
        with httpx.Client(base_url=api_base_url, timeout=5.0) as client:
            for item in pending:
                try:
                    res = client.post("/api/events", json=item["payload"])
                    if res.status_code in (200, 201):
                        self.remove_buffered_event(item["db_id"])
                        success_count += 1
                        logger.info(f"[EdgeBuffer] Drained event {item['event_uuid']} successfully.")
                    else:
                        logger.warning(f"[EdgeBuffer] API rejected event {item['event_uuid']}: {res.status_code}")
                        break  # Stop draining on API error to avoid hammering
                except Exception as e:
                    logger.warning(f"[EdgeBuffer] Cellular connection unreachable during drain: {e}")
                    break  # Cellular connection still offline

        return success_count
