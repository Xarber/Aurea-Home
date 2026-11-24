# SPDX-License-Identifier: AGPL-3.0-only
"""Signed and replay-bounded communication with a local Aurea television."""

import base64
import hmac
from ipaddress import IPv4Address, IPv4Network
import json
import re
import secrets
from time import time
from urllib.parse import urlsplit

from aiohttp import ClientSession, ClientTimeout

DOMAIN = "aurea_home"
_PLAT = "homeassistant"
_LAN = tuple(IPv4Network(cidr) for cidr in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"))


def endpoint(address: str) -> str:
    url = urlsplit(address)
    numeric = IPv4Address(url.hostname or "")
    if (url.scheme != "http" or not any(numeric in net for net in _LAN)
            or url.username or url.password or url.path not in ("", "/")
            or url.query or url.fragment or url.port == 0):
        raise ValueError("Invalid local Aurea URL")
    return f"http://{numeric}" + (f":{url.port}" if url.port else "") + "/api/automation"


def encoded(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def decoded(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


class AureaError(Exception):
    """The signed Aurea request failed."""


async def read_envelope(response, limit):
    raw = bytearray()
    async for chunk in response.content.iter_chunked(16384):
        raw.extend(chunk)
        if len(raw) > limit:
            raise AureaError("Invalid Aurea response size")
    try:
        value = json.loads(raw)
    except ValueError as error:
        raise AureaError("Invalid Aurea response") from error
    if not isinstance(value, dict):
        raise AureaError("Invalid Aurea response")
    return value


class AureaClient:
    """Products use separate TV-issued keys."""

    def __init__(self, session: ClientSession, address: str, key: str):
        self.session = session
        self.url = endpoint(address)
        if not re.fullmatch(r"[A-Za-z0-9_-]{43}", key):
            raise ValueError("Invalid Aurea key")
        self.key = decoded(key)

    def _sign(self, *parts: str) -> str:
        return encoded(hmac.digest(self.key, "\n".join(parts).encode(), "sha256"))

    async def request(self, action: str, **parameters):
        async with self.session.get(self.url + "/challenge", allow_redirects=False,
                                    timeout=ClientTimeout(total=4)) as response:
            if response.status != 200:
                raise AureaError("Aurea connection is unavailable")
            challenge = await read_envelope(response, 512)
        epoch = challenge.get("epoch")
        if not isinstance(epoch, str) or not re.fullmatch(r"[a-f0-9-]{36}", epoch):
            raise AureaError("Invalid Aurea challenge")
        timestamp, nonce = int(time()), encoded(secrets.token_bytes(16))
        body = encoded(json.dumps({"action": action, **parameters}).encode())
        payload = {
            "platform": _PLAT, "epoch": epoch, "timestamp": timestamp, "nonce": nonce, "body": body,
            "signature": self._sign("aurea-automation-request-v1", _PLAT, epoch, str(timestamp), nonce, body),
        }
        async with self.session.post(self.url, json=payload, allow_redirects=False,
                                     timeout=ClientTimeout(total=4.5)) as response:
            if response.status != 200:
                raise AureaError("Aurea connection is unavailable or unauthorized")
            envelope = await read_envelope(response, 200000)
        try:
            body, signature = envelope["body"], envelope["signature"]
            if not hmac.compare_digest(self._sign("aurea-automation-response-v1", _PLAT, nonce, body), signature):
                raise AureaError("Aurea response could not be verified")
            result = json.loads(decoded(body))
            if not isinstance(result, dict) or result.get("error"):
                raise AureaError("The TV could not execute this action")
            return result
        except (KeyError, TypeError, ValueError) as error:
            raise AureaError("Invalid Aurea response") from error
