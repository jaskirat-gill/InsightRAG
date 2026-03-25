"""
Unit tests for utils/password.py

Tests cover bcrypt hashing, verification, and the explicit 72-byte truncation
behaviour documented in the source (bcrypt hard limit).
No database or external services required.
"""
from utils.password import hash_password, verify_password


def test_hash_differs_from_plaintext():
    """Hashed output must never equal the original password."""
    assert hash_password("secret") != "secret"


def test_verify_correct_password():
    """verify_password must return True when the plaintext matches the hash."""
    hashed = hash_password("secret")
    assert verify_password("secret", hashed) is True


def test_verify_wrong_password():
    """verify_password must return False when the plaintext does not match."""
    hashed = hash_password("secret")
    assert verify_password("wrong_password", hashed) is False


def test_72_byte_truncation_matches():
    """
    Passwords longer than 72 bytes are silently truncated before hashing
    (explicit behaviour in lines 9-10 and 16-17 of password.py).
    A 80-char password and its first 72 chars must therefore verify against
    the same hash.
    """
    long_password = "a" * 80
    truncated = "a" * 72
    hashed = hash_password(long_password)
    assert verify_password(truncated, hashed) is True


def test_different_passwords_produce_different_hashes():
    """Two distinct passwords must never produce the same hash."""
    assert hash_password("password1") != hash_password("password2")


def test_bcrypt_salting_produces_different_hashes_for_same_input():
    """
    bcrypt uses a random salt on every call, so hashing the same password
    twice must yield two different hash strings — both still verify correctly.
    """
    hash1 = hash_password("same_password")
    hash2 = hash_password("same_password")
    assert hash1 != hash2
    assert verify_password("same_password", hash1) is True
    assert verify_password("same_password", hash2) is True
