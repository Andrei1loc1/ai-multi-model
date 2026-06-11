import httpx

url = "http://localhost:8001/extract"
file_path = r"C:\Users\Andrei\Desktop\CV-s\CV.pdf"

with open(file_path, "rb") as f:
    files = {"file": ("CV.pdf", f, "application/pdf")}
    r = httpx.post(url, files=files, timeout=120)
    print(f"Status: {r.status_code}")
    print(f"Headers: {dict(r.headers)}")
    print(f"Body: {r.text[:2000]}")