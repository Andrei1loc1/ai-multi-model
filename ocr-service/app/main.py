import sys
import io
import base64
import os
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import httpx

app = FastAPI(title="OCR Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_ocr = None

OLLAMA_ENDPOINT = os.environ.get("OLLAMA_VISION_ENDPOINT", "https://ollama.com/api/chat")
OLLAMA_API_KEY = os.environ.get("OLLAMA_VISION_API_KEY", os.environ.get("OLLAMA_API_KEY", ""))
OLLAMA_VISION_MODEL = os.environ.get("OLLAMA_VISION_MODEL", "llava")


def get_ocr():
    global _ocr
    if _ocr is None:
        _ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr


def _ocr_bytes(img_bytes: bytes) -> str:
    ocr = get_ocr()
    result = ocr.ocr(img_bytes, cls=True)
    parts = []
    if result and result[0]:
        for line in result[0]:
            if len(line) >= 2 and isinstance(line[1], list):
                text = line[1][0]
                if text:
                    parts.append(text)
            elif len(line) >= 2 and isinstance(line[1], str):
                parts.append(line[1])
    return "\n".join(parts)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/extract")
async def extract_text(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    if suffix == ".pdf":
        return await _extract_from_pdf(content)
    else:
        return await _extract_from_image(content)


async def _extract_from_pdf(content: bytes):
    import fitz

    doc = fitz.open(stream=content, filetype="pdf")
    pages = []
    used_ocr = False

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()

        if text:
            pages.append(text)
        else:
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")
            ocr_text = _ocr_bytes(img_bytes).strip()
            if ocr_text:
                pages.append(ocr_text)
                used_ocr = True

    doc.close()

    if not pages:
        return {"text": "", "pages": 0, "method": "none"}

    method = "pymupdf+ocr" if used_ocr else "pymupdf"
    return {"text": "\n\n".join(pages), "pages": len(pages), "method": method}


async def _extract_from_image(content: bytes):
    ocr_text = _ocr_bytes(content)
    return {"text": ocr_text, "pages": 1, "method": "ocr"}


@app.post("/vision")
async def analyze_image(
    file: UploadFile = File(...),
    prompt: str = Query(default="Describe this image in detail. Extract any text, identify objects, people, scenes, diagrams, code, or structures. Be thorough."),
    model: str = Query(default=None),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    vision_model = model or OLLAMA_VISION_MODEL
    b64 = base64.b64encode(content).decode("utf-8")

    suffix = Path(file.filename).suffix.lower()
    mime_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
    }
    mime_type = mime_map.get(suffix, "image/png")

    payload = {
        "model": vision_model,
        "messages": [
            {
                "role": "user",
                "content": prompt,
                "images": [b64],
            }
        ],
        "stream": False,
    }

    headers = {"Content-Type": "application/json"}
    if OLLAMA_API_KEY:
        headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(OLLAMA_ENDPOINT, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        description = ""
        if isinstance(data, dict):
            message = data.get("message", {})
            if isinstance(message, dict):
                description = message.get("content", "")
            if not description:
                description = data.get("response", "")
        if not description:
            description = str(data)

        return {
            "text": description,
            "model": vision_model,
            "method": "ollama-vision",
        }
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama vision error: {e.response.status_code} {e.response.text[:500]}",
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="Cannot connect to Ollama vision endpoint.")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Ollama vision request timed out.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama vision error: {str(e)}")