"""PDF text + image extraction with OCR fallback."""

from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass, field

import fitz
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

_easyocr_reader = None


@dataclass
class ExtractedImage:
    page: int
    mime_type: str
    data: bytes
    width: int = 0
    height: int = 0


@dataclass
class ExtractedDocument:
    filename: str
    text: str
    images: list[ExtractedImage] = field(default_factory=list)
    page_count: int = 0


def init_ocr_readers() -> None:
    """Warm up EasyOCR — call once at worker boot to avoid per-request cold-starts."""
    global _easyocr_reader
    try:
        import easyocr

        if _easyocr_reader is None:
            _easyocr_reader = easyocr.Reader(["en"], gpu=False)
            logger.info("EasyOCR reader initialized")
    except Exception as exc:
        logger.warning("EasyOCR initialization skipped: %s", exc)


def _ocr_page(page: fitz.Page) -> str:
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img = Image.open(io.BytesIO(pix.tobytes("png")))

    text = ""
    try:
        import pytesseract

        text = pytesseract.image_to_string(img, lang="eng").strip()
    except Exception as exc:
        logger.debug("Tesseract failed: %s", exc)

    if len(text) < 50 and _easyocr_reader is not None:
        try:
            results = _easyocr_reader.readtext(np.array(img))
            ocr_text = "\n".join(r[1] for r in results).strip()
            if len(ocr_text) > len(text):
                text = ocr_text
        except Exception as exc:
            logger.debug("EasyOCR failed: %s", exc)

    return text


def _clean(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[^\S\n]+", " ", text)
    return text.strip()


def extract_document(
    pdf_bytes: bytes,
    filename: str,
    *,
    use_ocr: bool = True,
    extract_images: bool = True,
) -> ExtractedDocument:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images: list[ExtractedImage] = []
    parts: list[str] = []

    try:
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text().strip()
            if use_ocr and len(text) < 50:
                ocr_text = _ocr_page(page)
                if len(ocr_text) > len(text):
                    text = ocr_text

            if extract_images:
                for img_index, img in enumerate(page.get_images()):
                    try:
                        xref = img[0]
                        base = doc.extract_image(xref)
                        images.append(
                            ExtractedImage(
                                page=page_num,
                                mime_type=f"image/{base['ext']}",
                                data=base["image"],
                                width=base.get("width", 0),
                                height=base.get("height", 0),
                            )
                        )
                    except Exception as exc:
                        logger.warning("image extract failed p%s i%s: %s", page_num, img_index, exc)

            parts.append(f"\n\n---\n\n**Page {page_num}**\n\n{text}")

        return ExtractedDocument(
            filename=filename,
            text=_clean("".join(parts)),
            images=images,
            page_count=doc.page_count,
        )
    finally:
        doc.close()


def merge_documents(docs: list[ExtractedDocument]) -> str:
    return "\n\n".join(f"# {d.filename}\n{d.text}" for d in docs)
