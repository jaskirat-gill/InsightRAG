import os
from typing import Dict, Any, List

# Maps file extension to (parse_profile, chunk_strategy, chunk_params)
_EXTENSION_MAP: Dict[str, Dict[str, Any]] = {
    # Tabular formats — table-preserving chunking
    ".csv":  {"parse_profile": "tabular",    "chunk_strategy": "table-preserving", "chunk_params": {}},
    ".tsv":  {"parse_profile": "tabular",    "chunk_strategy": "table-preserving", "chunk_params": {}},
    ".xlsx": {"parse_profile": "tabular",    "chunk_strategy": "table-preserving", "chunk_params": {}},
    ".xls":  {"parse_profile": "tabular",    "chunk_strategy": "table-preserving", "chunk_params": {}},

    # Presentations — one chunk per slide
    ".pptx": {"parse_profile": "slide",      "chunk_strategy": "slide-per-chunk",  "chunk_params": {}},
    ".ppt":  {"parse_profile": "slide",      "chunk_strategy": "slide-per-chunk",  "chunk_params": {}},

    # Word documents — split at section headings
    ".docx": {"parse_profile": "office_doc", "chunk_strategy": "section-aware",    "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".doc":  {"parse_profile": "office_doc", "chunk_strategy": "section-aware",    "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},

    # Markup / structured text — split at headings
    ".md":   {"parse_profile": "markdown",   "chunk_strategy": "section-aware",    "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".html": {"parse_profile": "html",       "chunk_strategy": "section-aware",    "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".htm":  {"parse_profile": "html",       "chunk_strategy": "section-aware",    "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},

    # Images — OCR via hi_res, then semantic chunking
    ".png":  {"parse_profile": "image_ocr",  "chunk_strategy": "semantic",         "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".jpeg": {"parse_profile": "image_ocr",  "chunk_strategy": "semantic",         "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".jpg":  {"parse_profile": "image_ocr",  "chunk_strategy": "semantic",         "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".bmp":  {"parse_profile": "image_ocr",  "chunk_strategy": "semantic",         "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".tiff": {"parse_profile": "image_ocr",  "chunk_strategy": "semantic",         "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".tif":  {"parse_profile": "image_ocr",  "chunk_strategy": "semantic",         "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
    ".heic": {"parse_profile": "image_ocr",  "chunk_strategy": "semantic",         "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},

    # Plain text — semantic sliding window
    ".txt":  {"parse_profile": None,         "chunk_strategy": "semantic",         "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}},
}

_DEFAULT = {"parse_profile": None, "chunk_strategy": "semantic", "chunk_params": {"chunk_size": 512, "chunk_overlap": 50}}

# Chunk strategies that work safely on each format.
# semantic, section-aware, table-preserving are universally safe — Unstructured
# gracefully degrades when the expected structure isn't present.
# slide-per-chunk requires page_number metadata so it's limited to pptx/ppt.
_UNIVERSAL_CHUNK: List[str] = ["semantic", "section-aware", "table-preserving"]

COMPATIBLE_CHUNK_STRATEGIES: Dict[str, List[str]] = {
    ".csv":  _UNIVERSAL_CHUNK,
    ".tsv":  _UNIVERSAL_CHUNK,
    ".xlsx": _UNIVERSAL_CHUNK,
    ".xls":  _UNIVERSAL_CHUNK,
    ".pptx": ["slide-per-chunk"] + _UNIVERSAL_CHUNK,
    ".ppt":  ["slide-per-chunk"] + _UNIVERSAL_CHUNK,
    ".docx": _UNIVERSAL_CHUNK,
    ".doc":  _UNIVERSAL_CHUNK,
    ".md":   _UNIVERSAL_CHUNK,
    ".html": _UNIVERSAL_CHUNK,
    ".htm":  _UNIVERSAL_CHUNK,
    # Images and plain text produce unstructured text after OCR/read — only semantic
    ".png":  ["semantic"],
    ".jpeg": ["semantic"],
    ".jpg":  ["semantic"],
    ".bmp":  ["semantic"],
    ".tiff": ["semantic"],
    ".tif":  ["semantic"],
    ".heic": ["semantic"],
    ".txt":  ["semantic"],
}
_DEFAULT_COMPATIBLE: List[str] = ["semantic"]


def get_compatible_strategies(local_path: str) -> List[str]:
    """Return the list of valid chunk strategy keys for the given file."""
    ext = os.path.splitext(local_path)[1].lower()
    return COMPATIBLE_CHUNK_STRATEGIES.get(ext, _DEFAULT_COMPATIBLE)


def select_strategy(local_path: str) -> Dict[str, Any]:
    """
    Return the parse profile and chunking strategy for a given file.

    Returns a dict with:
      - parse_profile: str | None  (passed to parse_document)
      - chunk_strategy: str        (key into CHUNK_DISPATCH in pipeline)
      - chunk_params: dict         (keyword args forwarded to the chunker)
    """
    ext = os.path.splitext(local_path)[1].lower()
    return _EXTENSION_MAP.get(ext, _DEFAULT).copy()
