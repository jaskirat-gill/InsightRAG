import gzip
import json
import logging
import os
from typing import Any, List, Optional

import redis

logger = logging.getLogger("doc_worker.cache")

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
_client: Optional[redis.Redis] = None

PARSE_CACHE_TTL = int(os.getenv("PARSE_CACHE_TTL", "86400"))  # 24 hours default


def _get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(REDIS_URL, decode_responses=False)
    return _client


def _make_key(etag: str, parse_profile: str) -> str:
    return f"parse:{etag}:{parse_profile}"


def get_parse_cache(etag: str, parse_profile: str) -> Optional[List[Any]]:
    """Return cached parsed elements, or None on miss/error."""
    try:
        raw = _get_client().get(_make_key(etag, parse_profile))
        if raw is None:
            logger.debug("Parse cache miss: etag=%s profile=%s", etag, parse_profile)
            return None
        elements = json.loads(gzip.decompress(raw))
        logger.info("Parse cache hit: etag=%s profile=%s (%d elements)", etag, parse_profile, len(elements))
        return elements
    except Exception as e:
        logger.warning("Parse cache get failed, will re-parse: %s", e)
        return None


def set_parse_cache(etag: str, parse_profile: str, elements: List[Any], ttl: int = PARSE_CACHE_TTL) -> None:
    """Compress and store parsed elements in Redis."""
    try:
        compressed = gzip.compress(json.dumps(elements).encode())
        _get_client().setex(_make_key(etag, parse_profile), ttl, compressed)
        logger.info(
            "Parse cache stored: etag=%s profile=%s (%d elements, %d bytes compressed)",
            etag, parse_profile, len(elements), len(compressed),
        )
    except Exception as e:
        logger.warning("Parse cache set failed (non-fatal): %s", e)
