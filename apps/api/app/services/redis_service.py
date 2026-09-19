import json
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

def _connect():
    """Connects to Redis, or returns None quickly when it is not running.

    Short timeouts matter: telemetry ingest calls into this on every message,
    so a missing Redis must fail in milliseconds rather than stalling the API.
    """
    try:
        import redis

        client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.25,
            socket_timeout=0.25,
        )
        client.ping()
        return client
    except Exception:
        logger.warning(
            f"Redis unavailable at {settings.REDIS_URL}. Geo index and pub/sub are disabled; "
            "the API and dashboard keep working over HTTP."
        )
        return None


_redis_client = _connect()


def _disable(reason: str):
    """Stops calling Redis after a failure so one outage cannot slow ingest."""
    global _redis_client
    if _redis_client is not None:
        logger.warning(f"Disabling Redis integration: {reason}")
    _redis_client = None

CHANNEL_BUS_UPDATES = "channel:bus_updates"
CHANNEL_EVENT_ALERTS = "channel:event_alerts"
REDIS_BUS_GEO_KEY = "gis:buses:positions"

class RedisService:
    @staticmethod
    def update_bus_geo(bus_id: str, longitude: float, latitude: float):
        """Updates bus position in Redis spatial Geo index for < 2ms proximity queries."""
        if not _redis_client:
            return
        try:
            _redis_client.geoadd(REDIS_BUS_GEO_KEY, (longitude, latitude, bus_id))
        except Exception as e:
            _disable(f"GEOADD failed ({e})")

    @staticmethod
    def publish_bus_update(payload: Dict[str, Any]):
        """Publishes bus telemetry update to Redis Pub/Sub channel for live WebSockets."""
        if not _redis_client:
            return
        try:
            _redis_client.publish(CHANNEL_BUS_UPDATES, json.dumps(payload))
        except Exception as e:
            _disable(f"publish failed ({e})")

    @staticmethod
    def publish_event_alert(payload: Dict[str, Any]):
        """Publishes road defect/incident alert to Redis Pub/Sub channel."""
        if not _redis_client:
            return
        try:
            _redis_client.publish(CHANNEL_EVENT_ALERTS, json.dumps(payload))
        except Exception as e:
            _disable(f"event publish failed ({e})")
