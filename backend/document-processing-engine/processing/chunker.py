import logging
from collections import defaultdict
from typing import List, Dict, Any

logger = logging.getLogger("doc_worker.chunker")

# Element types treated as section boundary markers
_HEADING_TYPES = {"Title", "Header"}


def chunk_semantic(
    elements: List[Dict[str, Any]],
    chunk_size: int = 512,
    chunk_overlap: int = 50,
) -> List[Dict[str, Any]]:
    """
    Semantic chunking using LlamaIndex SentenceSplitter.

    Takes parsed document elements and produces chunks that respect
    sentence boundaries.

    Returns list of dicts with:
      - chunk_text: str
      - chunk_index: int
      - section_title: str | None
      - page_number: int | None
      - token_count: int (approximate)
    """
    full_text = "\n\n".join(el["text"] for el in elements)

    if not full_text.strip():
        logger.warning("No text content to chunk")
        return []

    section_map = _build_section_map(elements, full_text)

    try:
        from llama_index.core.node_parser import SentenceSplitter

        splitter = SentenceSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        chunks_text = splitter.split_text(full_text)
    except ImportError:
        logger.warning("llama_index not available, falling back to simple splitter")
        chunks_text = _simple_split(full_text, chunk_size, chunk_overlap)

    chunks = []
    for idx, text in enumerate(chunks_text):
        section_title, page_number = _lookup_metadata(text, section_map)
        token_count = len(text.split())

        chunks.append({
            "chunk_text": text,
            "chunk_index": idx,
            "section_title": section_title,
            "page_number": page_number,
            "token_count": token_count,
        })

    logger.info("Produced %d chunks (chunk_size=%d, overlap=%d)", len(chunks), chunk_size, chunk_overlap)
    return chunks


def chunk_table_preserving(
    elements: List[Dict[str, Any]],
    max_rows_per_chunk: int = 50,
) -> List[Dict[str, Any]]:
    """
    Table-preserving chunking for CSV, TSV, and Excel files.

    Each Table element from unstructured is kept as one chunk. If a table has
    more rows than max_rows_per_chunk, it is split at row boundaries. Non-table
    elements (titles, descriptions) become small standalone chunks.
    """
    if not elements:
        return []

    chunks = []
    chunk_index = 0

    for el in elements:
        el_type = el["metadata"].get("element_type", "")
        text = el["text"].strip()
        if not text:
            continue

        section_title = el["metadata"].get("section_title")
        page_number = el["metadata"].get("page_number")

        if el_type == "Table":
            rows = [r for r in text.split("\n") if r.strip()]
            if len(rows) <= max_rows_per_chunk:
                chunks.append(_make_chunk(text, chunk_index, section_title, page_number))
                chunk_index += 1
            else:
                # Split large tables at row boundaries
                for start in range(0, len(rows), max_rows_per_chunk):
                    batch = rows[start: start + max_rows_per_chunk]
                    chunk_text = "\n".join(batch)
                    chunks.append(_make_chunk(chunk_text, chunk_index, section_title, page_number))
                    chunk_index += 1
        else:
            # Non-table content (titles, notes) — keep as-is
            chunks.append(_make_chunk(text, chunk_index, section_title, page_number))
            chunk_index += 1

    logger.info("Produced %d table-preserving chunks", len(chunks))
    return chunks


def chunk_slide_per_chunk(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Slide-per-chunk strategy for PowerPoint files.

    Groups all elements that share the same page_number (slide) into a single
    chunk. Falls back to chunk_semantic if no page numbers are present.
    """
    if not elements:
        return []

    # Check if page numbers are available
    has_pages = any(el["metadata"].get("page_number") is not None for el in elements)
    if not has_pages:
        logger.warning("No page numbers found for slide chunking, falling back to semantic")
        return chunk_semantic(elements)

    # Group elements by slide (page_number)
    slides: Dict[int, List[Dict]] = defaultdict(list)
    for el in elements:
        page = el["metadata"].get("page_number") or 0
        slides[page].append(el)

    chunks = []
    for slide_num in sorted(slides.keys()):
        slide_elements = slides[slide_num]
        slide_text = "\n".join(el["text"] for el in slide_elements if el["text"].strip())
        if not slide_text.strip():
            continue

        # Use the first Title on the slide as section_title if present
        section_title = next(
            (el["metadata"].get("section_title") for el in slide_elements
             if el["metadata"].get("element_type") == "Title"),
            slide_elements[0]["metadata"].get("section_title"),
        )

        chunks.append(_make_chunk(slide_text, len(chunks), section_title, slide_num))

    logger.info("Produced %d slide chunks", len(chunks))
    return chunks


def chunk_section_aware(
    elements: List[Dict[str, Any]],
    chunk_size: int = 512,
    chunk_overlap: int = 50,
) -> List[Dict[str, Any]]:
    """
    Section-aware chunking for Word documents, Markdown, and HTML.

    Accumulates elements within a section (bounded by Title/Header elements).
    When accumulated text exceeds chunk_size tokens, the section is split using
    the semantic splitter — but never across a heading boundary.
    """
    if not elements:
        return []

    chunks = []
    current_heading: str | None = None
    current_page: int | None = None
    buffer: List[str] = []

    def _flush_buffer():
        nonlocal buffer
        text = "\n\n".join(buffer).strip()
        buffer = []
        if not text:
            return
        # If the section fits in one chunk, emit directly
        if len(text.split()) <= chunk_size:
            chunks.append(_make_chunk(text, len(chunks), current_heading, current_page))
        else:
            # Section is large — split semantically within the section boundary
            sub_chunks = _split_text(text, chunk_size, chunk_overlap)
            for sub in sub_chunks:
                chunks.append(_make_chunk(sub, len(chunks), current_heading, current_page))

    for el in elements:
        el_type = el["metadata"].get("element_type", "")
        text = el["text"].strip()
        page = el["metadata"].get("page_number")

        if el_type in _HEADING_TYPES:
            _flush_buffer()
            current_heading = text
            current_page = page or current_page
            # Include the heading text in the next section's buffer
            buffer.append(text)
        else:
            if page is not None:
                current_page = page
            if text:
                buffer.append(text)

    _flush_buffer()

    logger.info("Produced %d section-aware chunks", len(chunks))
    return chunks


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _make_chunk(
    text: str,
    index: int,
    section_title: str | None,
    page_number: int | None,
) -> Dict[str, Any]:
    return {
        "chunk_text": text,
        "chunk_index": index,
        "section_title": section_title,
        "page_number": page_number,
        "token_count": len(text.split()),
    }


def _split_text(text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    """Split text using LlamaIndex SentenceSplitter with simple fallback."""
    try:
        from llama_index.core.node_parser import SentenceSplitter
        splitter = SentenceSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        return splitter.split_text(text)
    except ImportError:
        return _simple_split(text, chunk_size, chunk_overlap)


def _build_section_map(elements: List[Dict[str, Any]], full_text: str) -> List[Dict]:
    """Build a map of text positions to section/page metadata."""
    section_map = []
    pos = 0
    for el in elements:
        text = el["text"]
        idx = full_text.find(text, pos)
        if idx >= 0:
            section_map.append({
                "start": idx,
                "end": idx + len(text),
                "section_title": el["metadata"].get("section_title"),
                "page_number": el["metadata"].get("page_number"),
            })
            pos = idx + len(text)
    return section_map


def _lookup_metadata(chunk_text: str, section_map: List[Dict]):
    """Find the section/page for a chunk by finding the last element whose text appears before the chunk starts."""
    section_title = None
    page_number = None

    for entry in section_map:
        if entry.get("section_title"):
            section_title = entry["section_title"]
        if entry.get("page_number"):
            page_number = entry["page_number"]

    return section_title, page_number


def _simple_split(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Fallback: split by words with overlap."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap if overlap < end else end
    return chunks
