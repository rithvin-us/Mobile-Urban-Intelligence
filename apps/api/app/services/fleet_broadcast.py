"""
Pushes fleet telemetry and new hazard events to connected WebSocket clients.

/api/ws/fleet accepted clients and then held the socket open without ever
sending anything, because nothing in the application called
ConnectionManager.broadcast. This task supplies that side: it samples the fleet
on a fixed interval and broadcasts a snapshot, followed by one alert per event
created since the previous tick.

The dashboard reaches the same data over HTTP polling, so this is additive: the
socket is for clients that prefer a push stream, and the task does no work at
all while no client is connected.

Database access runs through asyncio.to_thread because the session layer is
synchronous, and blocking the event loop would stall every other request.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.api.endpoints.websockets import ws_manager
from app.core.database import SessionLocal
from app.models.bus import Bus
from app.models.event import Event

logger = logging.getLogger(__name__)

BROADCAST_INTERVAL_SECONDS = 2.0

# One tick's worth of new detections is a handful; a cap keeps a backlog, such as
# the one a reconnecting database leaves behind, from flooding every client.
MAX_EVENTS_PER_TICK = 25


def _serialize_bus(bus: Bus) -> Dict[str, Any]:
    return {
        "id": bus.id,
        "bus_number": bus.bus_number,
        "route_name": bus.route_name,
        "latitude": bus.latitude,
        "longitude": bus.longitude,
        "heading": bus.heading,
        "speed": bus.speed,
        "status": bus.status,
        "last_seen": bus.last_seen.isoformat() if bus.last_seen else None,
    }


def _serialize_event(event: Event) -> Dict[str, Any]:
    return {
        "id": event.id,
        "bus_id": event.bus_id,
        "event_type": event.event_type,
        "confidence": event.confidence,
        "severity": event.severity,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "timestamp": event.timestamp.isoformat() if event.timestamp else None,
        "status": event.status,
        "evidence_url": event.evidence_url,
    }


def _collect(since: Optional[datetime]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Optional[datetime]]:
    """Reads one snapshot of the fleet plus the events created after `since`."""
    with SessionLocal() as db:
        buses = [_serialize_bus(bus) for bus in db.query(Bus).all()]

        query = db.query(Event)
        if since is not None:
            query = query.filter(Event.timestamp > since)
        rows = query.order_by(Event.timestamp.desc()).limit(MAX_EVENTS_PER_TICK).all()

        # Newest first out of the database, oldest first to the client, so a
        # dashboard appending to a list keeps events in the order they happened.
        rows.reverse()
        events = [_serialize_event(row) for row in rows]

        latest = db.query(Event.timestamp).order_by(Event.timestamp.desc()).limit(1).scalar()

    return buses, events, latest


async def run_fleet_broadcaster(interval: float = BROADCAST_INTERVAL_SECONDS) -> None:
    # The first tick establishes the watermark instead of replaying the whole
    # event history to whoever connects first.
    since: Optional[datetime] = None
    primed = False

    logger.info("Fleet WebSocket broadcaster started (%.1fs interval)", interval)
    try:
        while True:
            try:
                if ws_manager.active_connections:
                    buses, events, latest = await asyncio.to_thread(_collect, since)
                    if latest is not None:
                        since = latest

                    await ws_manager.broadcast({
                        "type": "FLEET_UPDATE",
                        "data": buses,
                        "server_time": datetime.now(timezone.utc).isoformat(),
                    })

                    if primed:
                        for event in events:
                            await ws_manager.broadcast({"type": "EVENT_ALERT", "data": event})
                    primed = True
                else:
                    # Nobody is listening, so skip the query but keep the
                    # watermark fresh, or the first client would be sent every
                    # event accumulated while the socket was idle.
                    since = None
                    primed = False
            except Exception as exc:
                logger.warning("Fleet broadcast tick failed: %s", exc)

            await asyncio.sleep(interval)
    except asyncio.CancelledError:
        logger.info("Fleet WebSocket broadcaster stopped")
        raise
