"""
Unit tests for processing/parser.py

Tests focus on the pure helper functions that require no external libraries:
  - parse_document  (FileNotFoundError path)
  - _parse_plaintext
  - _sanitize_text
  - _resolve_pdf_profile

The unstructured-dependent paths (_parse_with_unstructured) are not unit-tested
here; they are covered by higher-level integration tests.
"""
import os
import tempfile

import pytest

from processing.parser import (
    PDF_PROFILE_AUTO,
    PDF_PROFILE_DATAVIZ_HEAVY,
    PDF_PROFILE_MULTICOLUMN,
    PDF_PROFILE_TABLE_HEAVY,
    _parse_plaintext,
    _resolve_pdf_profile,
    _sanitize_text,
    parse_document,
)


# ---------------------------------------------------------------------------
# parse_document — error handling
# ---------------------------------------------------------------------------

def test_missing_file_raises_file_not_found():
    """parse_document must raise FileNotFoundError immediately for a missing path."""
    with pytest.raises(FileNotFoundError):
        parse_document("/nonexistent/path/does_not_exist.txt")


# ---------------------------------------------------------------------------
# _parse_plaintext
# ---------------------------------------------------------------------------

def _write_temp_txt(content: str) -> str:
    """Write content to a temporary .txt file and return its path."""
    f = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8")
    f.write(content)
    f.close()
    return f.name


def test_plaintext_splits_on_double_newline():
    """Paragraphs separated by blank lines must become separate elements."""
    path = _write_temp_txt("First paragraph.\n\nSecond paragraph.\n\nThird paragraph.")
    try:
        results = _parse_plaintext(path)
        assert len(results) == 3
        assert results[0]["text"] == "First paragraph."
        assert results[1]["text"] == "Second paragraph."
        assert results[2]["text"] == "Third paragraph."
    finally:
        os.unlink(path)


def test_plaintext_result_has_required_keys():
    """Every element returned by _parse_plaintext must have text and full metadata."""
    path = _write_temp_txt("Some content here.")
    try:
        results = _parse_plaintext(path)
        assert len(results) > 0
        for result in results:
            assert "text" in result
            assert "metadata" in result
            assert "element_type" in result["metadata"]
            assert "section_title" in result["metadata"]
            assert "page_number" in result["metadata"]
    finally:
        os.unlink(path)


def test_plaintext_section_title_and_page_are_none():
    """_parse_plaintext has no structural awareness — section/page must be None."""
    path = _write_temp_txt("A paragraph.")
    try:
        results = _parse_plaintext(path)
        assert results[0]["metadata"]["section_title"] is None
        assert results[0]["metadata"]["page_number"] is None
    finally:
        os.unlink(path)


def test_plaintext_element_type_is_narrative():
    """_parse_plaintext always assigns element_type='NarrativeText'."""
    path = _write_temp_txt("Some text.")
    try:
        results = _parse_plaintext(path)
        assert results[0]["metadata"]["element_type"] == "NarrativeText"
    finally:
        os.unlink(path)


def test_plaintext_skips_blank_paragraphs():
    """Blank lines between paragraphs must not produce empty elements."""
    path = _write_temp_txt("\n\nActual content.\n\n\n\nMore content.\n\n")
    try:
        results = _parse_plaintext(path)
        for result in results:
            assert result["text"].strip() != ""
    finally:
        os.unlink(path)


def test_plaintext_nul_bytes_stripped():
    """NUL bytes in file content must be removed (PostgreSQL rejects them)."""
    path = _write_temp_txt("hello\x00world")
    try:
        results = _parse_plaintext(path)
        assert "\x00" not in results[0]["text"]
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# _sanitize_text
# ---------------------------------------------------------------------------

def test_sanitize_strips_nul_bytes():
    assert _sanitize_text("hello\x00world") == "helloworld"


def test_sanitize_multiple_nul_bytes():
    assert _sanitize_text("\x00a\x00b\x00") == "ab"


def test_sanitize_no_nul_unchanged():
    assert _sanitize_text("clean text") == "clean text"


def test_sanitize_empty_string():
    assert _sanitize_text("") == ""


# ---------------------------------------------------------------------------
# _resolve_pdf_profile
# ---------------------------------------------------------------------------

def test_resolve_explicit_valid_profile_wins():
    """An explicit valid profile name must be returned unchanged."""
    assert _resolve_pdf_profile("any.pdf", "pdf_table_heavy") == PDF_PROFILE_TABLE_HEAVY


def test_resolve_invalid_explicit_profile_falls_back():
    """An explicit profile name that is not in PDF_PARSE_PROFILES triggers filename detection."""
    # "generic_report.pdf" has no trigger keywords → falls back to auto
    result = _resolve_pdf_profile("generic_report.pdf", "unknown_profile")
    assert result == PDF_PROFILE_AUTO


def test_resolve_filename_table_keyword():
    """Filenames with financial/table keywords must select the table-heavy profile."""
    for name in ("financial_statement.pdf", "balance_sheet.pdf", "ledger_q4.pdf"):
        assert _resolve_pdf_profile(name, None) == PDF_PROFILE_TABLE_HEAVY, name


def test_resolve_filename_chart_keyword():
    """Filenames with visualisation keywords must select the dataviz-heavy profile."""
    for name in ("sales_dashboard.pdf", "growth_chart.pdf", "revenue_graph.pdf"):
        assert _resolve_pdf_profile(name, None) == PDF_PROFILE_DATAVIZ_HEAVY, name


def test_resolve_filename_column_keyword():
    """Filenames with multi-column keywords must select the multicolumn profile."""
    for name in ("journal_article.pdf", "newsletter_march.pdf", "magazine_issue.pdf"):
        assert _resolve_pdf_profile(name, None) == PDF_PROFILE_MULTICOLUMN, name


def test_resolve_unknown_filename_returns_auto(monkeypatch):
    """A filename with no matching keywords and no env override must return pdf_auto."""
    monkeypatch.delenv("PDF_DEFAULT_PROFILE", raising=False)
    assert _resolve_pdf_profile("generic_report.pdf", None) == PDF_PROFILE_AUTO


def test_resolve_env_override_respected(monkeypatch):
    """PDF_DEFAULT_PROFILE env var must override the default when it is a valid profile."""
    monkeypatch.setenv("PDF_DEFAULT_PROFILE", "pdf_multicolumn")
    assert _resolve_pdf_profile("generic_report.pdf", None) == PDF_PROFILE_MULTICOLUMN


def test_resolve_invalid_env_override_falls_back_to_auto(monkeypatch):
    """An invalid PDF_DEFAULT_PROFILE env value must fall back to pdf_auto."""
    monkeypatch.setenv("PDF_DEFAULT_PROFILE", "not_a_real_profile")
    assert _resolve_pdf_profile("generic_report.pdf", None) == PDF_PROFILE_AUTO
