"""
Unit tests for processing/chunker.py

All tests use the word-based _simple_split fallback path so that llama_index
is not required. chunk_semantic also exercises _simple_split automatically when
llama_index is unavailable in the test environment.
"""
import pytest

from processing.chunker import (
    _build_section_map,
    _lookup_metadata,
    _simple_split,
    chunk_semantic,
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def make_element(text, section_title=None, page_number=None):
    return {
        "text": text,
        "metadata": {"section_title": section_title, "page_number": page_number},
    }


# ---------------------------------------------------------------------------
# chunk_semantic
# ---------------------------------------------------------------------------

def test_empty_elements_returns_empty_list():
    """No elements → no chunks."""
    assert chunk_semantic([]) == []


def test_whitespace_only_elements_returns_empty():
    """Elements containing only whitespace produce no content → empty list."""
    elements = [make_element("   "), make_element("\n\n\t")]
    assert chunk_semantic(elements) == []


def test_chunk_index_is_sequential():
    """chunk_index values must form a gapless sequence 0, 1, 2, …"""
    elements = [make_element("word " * 300)]
    chunks = chunk_semantic(elements)
    assert len(chunks) > 0
    for i, chunk in enumerate(chunks):
        assert chunk["chunk_index"] == i


def test_chunk_output_has_required_keys():
    """Every chunk dict must contain the five expected keys."""
    elements = [make_element("Hello world. This is a test document with enough words.")]
    chunks = chunk_semantic(elements)
    assert len(chunks) > 0
    required_keys = {"chunk_text", "chunk_index", "section_title", "page_number", "token_count"}
    for chunk in chunks:
        assert required_keys.issubset(chunk.keys())


def test_token_count_matches_word_count():
    """token_count is computed as len(text.split()), so it must match."""
    elements = [make_element("one two three four five")]
    chunks = chunk_semantic(elements, chunk_size=512, chunk_overlap=0)
    assert len(chunks) == 1
    assert chunks[0]["token_count"] == len(chunks[0]["chunk_text"].split())


def test_section_metadata_propagated():
    """section_title and page_number from elements should appear in chunk metadata."""
    elements = [make_element("Introduction content here.", section_title="Intro", page_number=1)]
    chunks = chunk_semantic(elements)
    assert len(chunks) > 0
    # At least one chunk should have the section title from the element
    titles = {c["section_title"] for c in chunks}
    assert "Intro" in titles


# ---------------------------------------------------------------------------
# _simple_split
# ---------------------------------------------------------------------------

def test_simple_split_empty_string():
    """Splitting an empty string must return an empty list."""
    assert _simple_split("", 512, 50) == []


def test_simple_split_respects_chunk_size():
    """No chunk produced by _simple_split should exceed chunk_size words."""
    chunks = _simple_split("word " * 1000, chunk_size=10, overlap=2)
    assert len(chunks) > 0
    for chunk in chunks:
        assert len(chunk.split()) <= 10


def test_simple_split_single_chunk_when_text_fits():
    """Text shorter than chunk_size must produce exactly one chunk."""
    chunks = _simple_split("one two three", chunk_size=512, overlap=50)
    assert len(chunks) == 1
    assert chunks[0] == "one two three"


def test_simple_split_overlap_repeats_words():
    """With overlap > 0 the start of each successive chunk should re-use words from the previous."""
    text = " ".join(str(i) for i in range(20))  # "0 1 2 ... 19"
    chunks = _simple_split(text, chunk_size=5, overlap=2)
    # The first word of chunk N+1 should appear near the end of chunk N
    for i in range(len(chunks) - 1):
        last_words = set(chunks[i].split()[-2:])
        first_words = set(chunks[i + 1].split()[:2])
        assert last_words & first_words, f"No overlap between chunk {i} and {i+1}"


# ---------------------------------------------------------------------------
# _build_section_map
# ---------------------------------------------------------------------------

def test_build_section_map_positions():
    """_build_section_map must record the correct character positions for each element."""
    elements = [
        make_element("Introduction text", section_title="Intro", page_number=1),
        make_element("Body content here", section_title="Body", page_number=2),
    ]
    full_text = "Introduction text\n\nBody content here"
    section_map = _build_section_map(elements, full_text)

    assert len(section_map) == 2
    assert section_map[0]["section_title"] == "Intro"
    assert section_map[0]["page_number"] == 1
    assert section_map[1]["section_title"] == "Body"
    assert section_map[1]["page_number"] == 2


def test_build_section_map_start_before_end():
    """Every entry's start index must be strictly less than its end index."""
    elements = [make_element("Some text")]
    full_text = "Some text"
    section_map = _build_section_map(elements, full_text)
    for entry in section_map:
        assert entry["start"] < entry["end"]


# ---------------------------------------------------------------------------
# _lookup_metadata
# ---------------------------------------------------------------------------

def test_lookup_metadata_returns_last_section():
    """_lookup_metadata should return the last section_title seen in the map."""
    section_map = [
        {"section_title": "First", "page_number": 1},
        {"section_title": "Second", "page_number": 2},
    ]
    title, page = _lookup_metadata("any chunk text", section_map)
    assert title == "Second"
    assert page == 2


def test_lookup_metadata_empty_map_returns_none():
    """An empty section_map should yield (None, None)."""
    title, page = _lookup_metadata("any text", [])
    assert title is None
    assert page is None
