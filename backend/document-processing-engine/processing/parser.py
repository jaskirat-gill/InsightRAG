import logging
import os
from typing import List, Dict, Any

logger = logging.getLogger("doc_worker.parser")

BINARY_FORMATS = {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".odt", ".rtf", ".epub"}
PLAINTEXT_FORMATS = {".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".html", ".htm", ".yaml", ".yml"}


def parse_document(local_path: str) -> List[Dict[str, Any]]:
    """
    Extract text elements from a document file.

    Returns a list of dicts, each with:
      - text: str
      - metadata: dict (page_number, section_title, element_type)
    """
    if not os.path.exists(local_path):
        raise FileNotFoundError(f"File not found: {local_path}")

    ext = os.path.splitext(local_path)[1].lower()

    if ext in PLAINTEXT_FORMATS:
        try:
            return _parse_with_unstructured(local_path)
        except Exception:
            logger.info("unstructured unavailable for %s, using plaintext fallback", ext)
            return _parse_plaintext(local_path)

    if ext in BINARY_FORMATS:
        return _parse_with_unstructured(local_path)

    # Unknown format -- try unstructured, fail loudly if it can't handle it
    try:
        return _parse_with_unstructured(local_path)
    except ImportError:
        raise RuntimeError(
            f"Cannot parse {ext} files: unstructured library is not installed. "
            f"Only plaintext formats ({', '.join(sorted(PLAINTEXT_FORMATS))}) work without it."
        )


def _parse_with_unstructured(local_path: str) -> List[Dict[str, Any]]:
    """Use unstructured.partition_auto for rich document parsing."""
    from unstructured.partition.auto import partition

    elements = partition(filename=local_path)

    results = []
    current_section = None
    for el in elements:
        el_type = type(el).__name__

        if el_type == "Title":
            current_section = str(el)

        text = _sanitize_text(str(el).strip())
        if not text:
            continue

        metadata = {
            "element_type": el_type,
            "section_title": current_section,
        }

        el_meta = getattr(el, "metadata", None)
        if el_meta:
            page_num = getattr(el_meta, "page_number", None)
            if page_num is not None:
                metadata["page_number"] = page_num

        results.append({"text": text, "metadata": metadata})

    if not results:
        raise RuntimeError(f"unstructured extracted no content from {local_path}")

    return results


def _parse_plaintext(local_path: str) -> List[Dict[str, Any]]:
    """Simple fallback for plaintext formats only."""
    with open(local_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    content = _sanitize_text(content)
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]

    return [
        {
            "text": para,
            "metadata": {
                "element_type": "NarrativeText",
                "section_title": None,
                "page_number": None,
            },
        }
        for para in paragraphs
    ]


def _sanitize_text(text: str) -> str:
    """Strip NUL bytes and other problematic characters that PostgreSQL rejects."""
    return text.replace("\x00", "")
