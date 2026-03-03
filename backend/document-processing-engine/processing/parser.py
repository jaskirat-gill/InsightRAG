import logging
import os
from typing import List, Dict, Any, Optional

logger = logging.getLogger("doc_worker.parser")

BINARY_FORMATS = {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".odt", ".rtf", ".epub"}
PLAINTEXT_FORMATS = {".txt", ".md", ".csv", ".tsv", ".json", ".xml", ".html", ".htm", ".yaml", ".yml"}

PDF_PROFILE_AUTO = "pdf_auto"
PDF_PROFILE_TABLE_HEAVY = "pdf_table_heavy"
PDF_PROFILE_MULTICOLUMN = "pdf_multicolumn"
PDF_PROFILE_DATAVIZ_HEAVY = "pdf_dataviz_heavy"

PDF_PARSE_PROFILES: Dict[str, Dict[str, Any]] = {
    PDF_PROFILE_AUTO: {
        "strategy": "auto",
        "include_page_breaks": True,
    },
    PDF_PROFILE_TABLE_HEAVY: {
        "strategy": "hi_res",
        "include_page_breaks": True,
        "skip_infer_table_types": [],
        "languages": ["eng"],
    },
    PDF_PROFILE_MULTICOLUMN: {
        "strategy": "fast",
        "include_page_breaks": True,
    },
    PDF_PROFILE_DATAVIZ_HEAVY: {
        "strategy": "hi_res",
        "include_page_breaks": True,
        "skip_infer_table_types": [],
        "extract_images_in_pdf": True,
        "extract_image_block_types": ["Image", "Table"],
        "languages": ["eng"],
    },
}


def parse_document(local_path: str, parse_profile: Optional[str] = None) -> List[Dict[str, Any]]:
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
            return _parse_with_unstructured(local_path, parse_profile=parse_profile)
        except Exception:
            logger.info("unstructured unavailable for %s, using plaintext fallback", ext)
            return _parse_plaintext(local_path)

    if ext in BINARY_FORMATS:
        return _parse_with_unstructured(local_path, parse_profile=parse_profile)

    # Unknown format -- try unstructured, fail loudly if it can't handle it
    try:
        return _parse_with_unstructured(local_path, parse_profile=parse_profile)
    except ImportError:
        raise RuntimeError(
            f"Cannot parse {ext} files: unstructured library is not installed. "
            f"Only plaintext formats ({', '.join(sorted(PLAINTEXT_FORMATS))}) work without it."
        )


def _parse_with_unstructured(local_path: str, parse_profile: Optional[str] = None) -> List[Dict[str, Any]]:
    """Use unstructured.partition_auto for rich document parsing."""
    from unstructured.partition.auto import partition

    ext = os.path.splitext(local_path)[1].lower()
    partition_kwargs: Dict[str, Any] = {}
    if ext == ".pdf":
        profile = _resolve_pdf_profile(local_path, parse_profile)
        partition_kwargs = PDF_PARSE_PROFILES.get(profile, PDF_PARSE_PROFILES[PDF_PROFILE_AUTO]).copy()
        logger.info("Using PDF parse profile '%s' for %s", profile, local_path)

    try:
        elements = partition(filename=local_path, **partition_kwargs)
    except TypeError:
        # Older unstructured builds may not accept some kwargs (e.g. table/image flags).
        logger.warning("Retrying partition without optional kwargs for %s", local_path)
        strategy = partition_kwargs.get("strategy")
        if strategy:
            elements = partition(filename=local_path, strategy=strategy)
        else:
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


def _resolve_pdf_profile(local_path: str, requested_profile: Optional[str]) -> str:
    """Resolve the profile for this PDF (explicit override wins, else lightweight auto detection)."""
    if requested_profile in PDF_PARSE_PROFILES:
        return requested_profile

    file_name = os.path.basename(local_path).lower()

    if any(k in file_name for k in ("table", "financial", "statement", "balance", "ledger")):
        return PDF_PROFILE_TABLE_HEAVY
    if any(k in file_name for k in ("chart", "graph", "visual", "dashboard", "plot")):
        return PDF_PROFILE_DATAVIZ_HEAVY
    if any(k in file_name for k in ("column", "newsletter", "journal", "magazine")):
        return PDF_PROFILE_MULTICOLUMN

    default_profile = os.getenv("PDF_DEFAULT_PROFILE", PDF_PROFILE_AUTO)
    return default_profile if default_profile in PDF_PARSE_PROFILES else PDF_PROFILE_AUTO
