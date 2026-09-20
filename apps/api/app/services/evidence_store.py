"""
Where an annotated camera frame is kept.

The edge unit produces a JPEG with the model's boxes burned in and sends it as
a `data:` URL. Storing that string in the events table is wrong twice over:
`evidence_url` is a VARCHAR(500) and Postgres rejects anything longer, and the
dashboard's event list would then carry ~190 KB per detection on a two-second
poll.

So the bytes are written once to disk and the row keeps a short path. The
browser gets a normal cacheable image URL, and the list payload stays small
enough to poll.
"""

import base64
import binascii
import logging
import os
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Overridable so a container can point this at a mounted disk or object store.
EVIDENCE_DIR = Path(
    os.getenv("EVIDENCE_DIR", str(Path(__file__).resolve().parents[1] / "static" / "evidence"))
)
EVIDENCE_ROUTE = "/static/evidence"

_DATA_URL = re.compile(r"^data:image/(?P<kind>[a-zA-Z0-9.+-]+);base64,(?P<payload>.+)$", re.S)

_EXTENSIONS = {
    "jpeg": ".jpg",
    "jpg": ".jpg",
    "png": ".png",
    "webp": ".webp",
    "svg+xml": ".svg",
}

# A data URL that decodes to more than this is refused rather than written.
MAX_EVIDENCE_BYTES = int(os.getenv("MAX_EVIDENCE_BYTES", str(8 * 1024 * 1024)))

# Anything longer than the column would be truncated by Postgres, so a URL that
# arrives already long is dropped rather than silently corrupted.
MAX_URL_LENGTH = 500


def ensure_dir() -> None:
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)


def store_data_url(event_id: str, value: Optional[str]) -> Optional[str]:
    """
    Turns a `data:image/...;base64,...` value into a served path.

    Anything that is not a data URL is passed through untouched, so plain http
    links and paths that the web app already serves keep working.
    """
    if not value:
        return None

    match = _DATA_URL.match(value.strip())
    if not match:
        if len(value) > MAX_URL_LENGTH:
            logger.warning(
                "Evidence URL for %s is %d chars and does not fit the column; dropping it.",
                event_id,
                len(value),
            )
            return None
        return value

    kind = match.group("kind").lower()
    extension = _EXTENSIONS.get(kind)
    if extension is None:
        logger.warning("Unsupported evidence image type '%s' for %s.", kind, event_id)
        return None

    try:
        payload = base64.b64decode(match.group("payload"), validate=True)
    except (binascii.Error, ValueError) as exc:
        logger.warning("Evidence for %s is not valid base64: %s", event_id, exc)
        return None

    if len(payload) > MAX_EVIDENCE_BYTES:
        logger.warning(
            "Evidence for %s is %d bytes, over the %d byte limit; dropping it.",
            event_id,
            len(payload),
            MAX_EVIDENCE_BYTES,
        )
        return None

    # The event id is generated server side and is a UUID or an edge-issued
    # slug; strip anything else so a crafted id cannot escape the directory.
    safe_id = re.sub(r"[^A-Za-z0-9_.-]", "_", event_id)[:64] or "event"

    try:
        ensure_dir()
        path = EVIDENCE_DIR / f"{safe_id}{extension}"
        path.write_bytes(payload)
    except OSError as exc:
        logger.warning("Could not write evidence for %s: %s", event_id, exc)
        return None

    return f"{EVIDENCE_ROUTE}/{safe_id}{extension}"
