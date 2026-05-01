"""Single Gemini call that produces structured Markdown.

The v1 pipeline used two Gemini calls (markdown then HTML). v2 uses a single
call: the model returns Markdown that already includes our color-class spans,
and WeasyPrint renders the styled PDF deterministically.
"""

from __future__ import annotations

import logging
from pathlib import Path

from google import genai
from google.api_core import exceptions as google_exc
from google.genai import errors as genai_errors
from google.genai import types
from tenacity import (
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_random_exponential,
    before_sleep_log,
)

from app.services.pdf_extractor import ExtractedImage

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "templates" / "pyq_system_prompt.txt"

_RETRYABLE_GOOGLE_API_CORE = (
    google_exc.ResourceExhausted,   # 429
    google_exc.ServiceUnavailable,   # 503
    google_exc.InternalServerError,  # 500
)


def _is_retryable(exc: BaseException) -> bool:
    # google-genai SDK raises its own exception hierarchy (not google.api_core)
    if isinstance(exc, genai_errors.ServerError):
        return True  # all 5xx, including 503 UNAVAILABLE
    if isinstance(exc, genai_errors.ClientError) and getattr(exc, "code", None) == 429:
        return True  # rate limited
    if isinstance(exc, _RETRYABLE_GOOGLE_API_CORE):
        return True
    if isinstance(exc, (ConnectionError, TimeoutError)):
        return True
    return False


def load_system_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


@retry(
    reraise=True,
    stop=stop_after_attempt(8),
    wait=wait_random_exponential(multiplier=1, min=5, max=90),
    retry=retry_if_exception(_is_retryable),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
async def generate_markdown(
    *,
    api_key: str,
    model: str,
    extracted_text: str,
    images: list[ExtractedImage],
    on_chunk=None,
) -> str:
    client = genai.Client(api_key=api_key)

    parts: list[types.Part] = [types.Part.from_text(text=extracted_text)]
    for img in images[:50]:  # cap inputs to stay under token budget
        parts.append(types.Part.from_bytes(data=img.data, mime_type=img.mime_type))

    config = types.GenerateContentConfig(
        system_instruction=load_system_prompt(),
        temperature=0.3,
    )

    accumulated = []
    stream = await client.aio.models.generate_content_stream(
        model=model,
        contents=[types.Content(role="user", parts=parts)],
        config=config,
    )
    async for event in stream:
        if event.text:
            accumulated.append(event.text)
            if on_chunk is not None:
                try:
                    on_chunk(event.text)
                except Exception:
                    logger.debug("on_chunk callback failed", exc_info=True)

    return "".join(accumulated).strip()
