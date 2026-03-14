"""
Shared fixtures for document-processing-engine unit tests.
"""
import pytest


def make_element(text, section_title=None, page_number=None):
    """Helper to build a parsed document element dict."""
    return {
        "text": text,
        "metadata": {
            "section_title": section_title,
            "page_number": page_number,
        },
    }


@pytest.fixture
def make_element_fixture():
    return make_element
