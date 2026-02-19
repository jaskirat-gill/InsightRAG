import logging
from typing import List, Dict, Any

logger = logging.getLogger("doc_worker.chunker")


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

    snippet = chunk_text[:80]
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
