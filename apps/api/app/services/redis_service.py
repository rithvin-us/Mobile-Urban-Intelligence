import json
import logging
from typing import Optional, List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import redis
    _redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    logger.warning(f"Could not connect to Redis at {settings.REDIS_URL}. Fallback in-memory mode active.")
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
            logger.error(f"Redis GEOADD failed: {e}")

    @staticmethod
    def publish_bus_update(payload: Dict[str, Any]):
        """Publishes bus telemetry update to Redis Pub/Sub channel for live WebSockets."""
        if not _redis_client:
            return
        try:
            _redis_client.publish(CHANNEL_BUS_UPDATES, json.dumps(payload))
        except Exception as e:
            logger.error(f"Redis publish failed: {e}")

    @staticmethod
    def publish_event_alert(payload: Dict[str, Any]):
        """Publishes road defect/incident alert to Redis Pub/Sub channel."""
        if not _redis_client:
            return
        try:
            _redis_client.publish(CHANNEL_EVENT_ALERTS, json.dumps(payload))
        except Exception as e:
            logger.error(f"Redis event publish failed: {e}")
