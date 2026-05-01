"""Redis pub/sub helpers for streaming job progress to the SSE endpoint."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import redis.asyncio as aioredis
from redis import Redis

from app.config import SETTINGS

_sync: Redis | None = None
_async: aioredis.Redis | None = None


def sync_client() -> Redis:
    global _sync
    if _sync is None:
        _sync = Redis.from_url(SETTINGS.redis_url, decode_responses=True)
    return _sync


def async_client() -> aioredis.Redis:
    global _async
    if _async is None:
        _async = aioredis.from_url(SETTINGS.redis_url, decode_responses=True)
    return _async


def channel(job_id: str) -> str:
    return f"job:{job_id}"


def publish(job_id: str, payload: dict[str, Any]) -> None:
    sync_client().publish(channel(job_id), json.dumps(payload))


async def subscribe(job_id: str) -> AsyncIterator[dict[str, Any]]:
    pubsub = async_client().pubsub()
    await pubsub.subscribe(channel(job_id))
    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = json.loads(message["data"])
            yield data
            if data.get("event") in {"complete", "error"}:
                return
    finally:
        await pubsub.unsubscribe(channel(job_id))
        await pubsub.aclose()
