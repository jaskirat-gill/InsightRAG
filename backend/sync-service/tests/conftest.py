"""
Shared fixtures for sync-service unit tests.

The sync-service imports `config.settings` at module level. All fields have
hardcoded defaults so no real environment is needed — tests run without a
database, Qdrant, or Redis connection.
"""
import pytest


@pytest.fixture
def sample_user_id():
    return "test-user-123"
