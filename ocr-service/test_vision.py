import httpx
import base64
import sys

OLLAMA_KEY = "9e488bdbe3c24b6c801d5df561ce544d.YT_6IMuI6ezewXlFYK8_R5m_"
ENDPOINT = "https://ollama.com/api/chat"
MODEL = "gemma4:31b-cloud"

# Use a small test image - create a simple 1x1 red PNG
import struct
import zlib

def create_minimal_png():
    # Minimal valid PNG
    signature = b'\x89PNG\r\n\x1a\n'
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    # IDAT
    raw_data = b'\x00\x00\x00\x00'  # filter byte + 1x1 RGB
    compressed = zlib.compress(raw_data)
    idat_crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff
    idat = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    # IEND
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    return signature + ihdr + idat + iend

png_bytes = create_minimal_png()
b64 = base64.b64encode(png_bytes).decode("utf-8")

print(f"Image base64 length: {len(b64)}")
print(f"Testing with model: {MODEL}")

payload = {
    "model": MODEL,
    "messages": [
        {
            "role": "user",
            "content": "What do you see in this image? Describe briefly.",
            "images": [b64],
        }
    ],
    "stream": False,
}

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {OLLAMA_KEY}",
}

try:
    r = httpx.post(ENDPOINT, json=payload, headers=headers, timeout=60)
    print(f"Status: {r.status_code}")
    data = r.json()
    if "message" in data and "content" in data["message"]:
        print(f"Response: {data['message']['content'][:500]}")
    elif "response" in data:
        print(f"Response: {data['response'][:500]}")
    else:
        print(f"Full response: {str(data)[:500]}")
except Exception as e:
    print(f"Error: {e}")