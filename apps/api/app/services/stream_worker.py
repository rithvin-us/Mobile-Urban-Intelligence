import json
import logging
import asyncio
from typing import Dict, Any
from app.services.redis_service import _redis_client

logger = logging.getLogger(__name__)

STREAM_TELEMETRY_KEY = "stream:telemetry"
STREAM_GROUP_NAME = "group:api_workers"

def enqueue_telemetry_event(payload: Dict[str, Any]):
    """Enqueues telemetry payload into Redis Streams for async processing."""
    if not _redis_client:
        return
    try:
        _redis_client.xadd(STREAM_TELEMETRY_KEY, {"data": json.dumps(payload)})
    except Exception as e:
        logger.error(f"[RedisStream] Error enqueuing telemetry: {e}")

async def run_redis_stream_worker():
    """Background worker consuming telemetry events from Redis Streams."""
    if not _redis_client:
        logger.warning("[RedisStream] Redis unavailable. Worker exiting.")
        return

    try:
        _redis_client.xgroup_create(STREAM_TELEMETRY_KEY, STREAM_GROUP_NAME, id="0", mkstream=True)
    except Exception:
        pass  # Group already exists

    logger.info("[RedisStream] Stream worker active. Consuming queue...")
    while True:
        try:
            entries = _redis_client.xreadgroup(
                STREAM_GROUP_NAME, "consumer_1", {STREAM_TELEMETRY_KEY: ">"}, count=10, block=2000
            )
            for stream_name, messages in entries:
                for msg_id, msg_data in messages:
                    raw_payload = msg_data.get("data")
                    if raw_payload:
                        logger.debug(f"[RedisStream] Processed async msg {msg_id}")
                    _redis_client.xack(STREAM_TELEMETRY_KEY, STREAM_GROUP_NAME, msg_id)
        except Exception as e:
            logger.error(f"[RedisStream] Worker exception: {e}")
            await asyncio.sleep(2.0)
