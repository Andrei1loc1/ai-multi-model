import sys
sys.path.insert(0, r"C:\Users\Andrei\Desktop\ai-multi-model\ocr-service")

from app.main import get_ocr
import fitz

file_path = r"C:\Users\Andrei\Desktop\CV-s\CV.pdf"

print("Opening PDF with PyMuPDF...")
doc = fitz.open(file_path)
print(f"Pages: {len(doc)}")

page = doc[0]
text = page.get_text("text")
print(f"Embedded text length: {len(text)}")
print(f"Embedded text preview: {text[:300]}")

print("\nTesting PaddleOCR on page 1...")
ocr = get_ocr()
pix = page.get_pixmap(dpi=300)
img_bytes = pix.tobytes("png")
result = ocr.ocr(img_bytes, cls=True)
print(f"OCR result type: {type(result)}")
print(f"OCR result: {result}")