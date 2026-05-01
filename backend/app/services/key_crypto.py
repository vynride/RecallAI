"""Symmetric envelope for opt-in stored Gemini keys.

Per-user key derived from `pepper + user.subject` via HKDF; the wrapped value
is a Fernet token. Nothing here is exposed unless the user opts in via the
settings page.
"""

from __future__ import annotations

import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.fernet import Fernet

from app.config import SETTINGS


def _derive(subject: str) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=SETTINGS.gemini_key_pepper.encode(),
        info=b"recallai/gemini-key/v1",
    )
    return base64.urlsafe_b64encode(hkdf.derive(subject.encode()))


def encrypt(api_key: str, subject: str) -> bytes:
    return Fernet(_derive(subject)).encrypt(api_key.encode())


def decrypt(token: bytes, subject: str) -> str:
    return Fernet(_derive(subject)).decrypt(token).decode()
