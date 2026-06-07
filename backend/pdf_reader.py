"""
pdf_reader.py
=============
Extracts text from PDF using pdfminer.six.
Returns both the full raw text AND a page-map:
  page_map: list of (start_char_index, end_char_index, page_number)

This lets the extractor locate which page any character belongs to
without re-reading the PDF.
"""

import io
from pdfminer.high_level import extract_text_to_fp
from pdfminer.layout import LAParams
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextBox, LTTextLine, LTChar


def extract_text_with_pages(file_obj: io.BytesIO) -> tuple[str, list[dict]]:
    """
    Returns:
        raw_text   : full document text
        page_map   : [{"page": int, "start": int, "end": int}, ...]
                     each entry marks the char range for that page
    """
    laparams = LAParams(
        line_margin=0.5,
        word_margin=0.1,
        char_margin=2.0,
        boxes_flow=0.5,
        detect_vertical=False,
    )

    pages_text: list[str] = []

    try:
        file_obj.seek(0)
        for page_num, page_layout in enumerate(extract_pages(file_obj, laparams=laparams), start=1):
            page_text_parts = []
            for element in page_layout:
                if hasattr(element, 'get_text'):
                    page_text_parts.append(element.get_text())
            pages_text.append("".join(page_text_parts))
    except Exception:
        # Fallback: use high_level extract if page-by-page fails
        file_obj.seek(0)
        output = io.StringIO()
        extract_text_to_fp(file_obj, output, laparams=laparams, output_type="text", codec=None)
        raw = output.getvalue()
        return raw, [{"page": 1, "start": 0, "end": len(raw)}]

    # Build page map
    page_map: list[dict] = []
    cursor = 0
    full_parts = []

    for page_num, text in enumerate(pages_text, start=1):
        start = cursor
        end = cursor + len(text)
        page_map.append({"page": page_num, "start": start, "end": end})
        full_parts.append(text)
        cursor = end

    raw_text = "".join(full_parts)
    return raw_text, page_map


def get_page_for_char(char_index: int, page_map: list[dict]) -> int:
    """Binary search page_map to find which page a char index falls on."""
    lo, hi = 0, len(page_map) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        entry = page_map[mid]
        if char_index < entry["start"]:
            hi = mid - 1
        elif char_index >= entry["end"]:
            lo = mid + 1
        else:
            return entry["page"]
    return page_map[-1]["page"] if page_map else 1
