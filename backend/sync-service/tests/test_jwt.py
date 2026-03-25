"""
Unit tests for utils/jwt.py

Tests cover token creation, payload content, expiry, and tamper detection.
No database or external services required.
"""
from datetime import timedelta

from utils.jwt import create_access_token, create_refresh_token, decode_token


def test_access_token_decode_roundtrip():
    """A token created with a subject should decode back to that same subject."""
    token = create_access_token({"sub": "user123"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user123"


def test_access_token_has_type_access():
    """Access tokens must carry type='access' in the payload."""
    token = create_access_token({"sub": "u1"})
    payload = decode_token(token)
    assert payload["type"] == "access"


def test_access_token_has_iat_and_exp():
    """Access tokens must include issued-at and expiry claims."""
    token = create_access_token({"sub": "u1"})
    payload = decode_token(token)
    assert "iat" in payload
    assert "exp" in payload


def test_access_token_custom_expiry():
    """A token with a custom (future) expiry should decode successfully."""
    token = create_access_token({"sub": "u1"}, expires_delta=timedelta(hours=2))
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "u1"


def test_expired_access_token_returns_none():
    """A token with a negative expiry is already expired — decode_token returns None."""
    token = create_access_token({"sub": "u1"}, expires_delta=timedelta(seconds=-1))
    result = decode_token(token)
    assert result is None


def test_refresh_token_has_type_refresh():
    """Refresh tokens must carry type='refresh' and the correct subject."""
    token = create_refresh_token("user42")
    payload = decode_token(token)
    assert payload is not None
    assert payload["type"] == "refresh"
    assert payload["sub"] == "user42"


def test_refresh_token_has_unique_jti():
    """Each refresh token must have a unique jti to support revocation."""
    token1 = create_refresh_token("user1")
    token2 = create_refresh_token("user1")
    payload1 = decode_token(token1)
    payload2 = decode_token(token2)
    assert payload1["jti"] != payload2["jti"]


def test_tampered_token_returns_none():
    """A malformed or tampered token string must return None, not raise."""
    assert decode_token("bad.token.value") is None


def test_arbitrary_data_preserved_in_access_token():
    """Extra claims passed to create_access_token should survive the round-trip."""
    token = create_access_token({"sub": "u1", "role": "admin"})
    payload = decode_token(token)
    assert payload["role"] == "admin"
