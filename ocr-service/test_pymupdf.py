import sys
sys.path.insert(0, r"C:\Users\Andrei\Desktop\ai-multi-model\ocr-service")

import fitz

file_path = r"C:\Users\Andrei\Desktop\CV-s\CV.pdf"

doc = fitz.open(file_path)
print(f"Pages: {len(doc)}")

all_text = []
for i in range(len(doc)):
    page = doc[i]
    text = page.get_text("text")
    all_text.append(text)
    sys.stdout.buffer.write(f"Page {i+1} text length: {len(text)}\n".encode("utf-8"))

full = "\n\n".join(all_text)
sys.stdout.buffer.write(f"Total text length: {len(full)}\n".encode("utf-8"))
sys.stdout.buffer.write(b"---PREVIEW---\n")
sys.stdout.buffer.write(full[:1000].encode("utf-8", errors="replace"))
sys.stdout.buffer.write(b"\n---END---\n")