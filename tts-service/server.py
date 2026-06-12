#!/usr/bin/env python3
"""Piper TTS HTTP microservice for voice chat."""

import io
import re
import wave
import struct
import sys
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
from pathlib import Path

TTS = None

def get_tts():
    global TTS
    if TTS is None:
        from piper import PiperVoice
        
        model_dir = Path(__file__).parent / "models" / "voices" / "lili"
        model_path = model_dir / "ro_RO-lili-medium.onnx"
        config_path = model_dir / "ro_RO-lili-medium.onnx.json"
        
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}. Run download_model.py first.")
        
        print(f"Loading Piper model: {model_path}...")
        TTS = PiperVoice.load(str(model_path), config_path=str(config_path))
        print("Model ro_RO-lili-medium loaded successfully!")
    return TTS


def verbalize_ro(text):
    """Convert abbreviations, symbols, numbers to spoken Romanian."""
    text = re.sub(r'\b(\d+)[°˚]C\b', lambda m: f"{m.group(1)} grade Celsius", text)
    text = re.sub(r'\b(\d+)[°˚]\b', lambda m: f"{m.group(1)} grade", text)
    text = re.sub(r'(\d+)%', lambda m: f"{m.group(1)} la sută", text)
    text = re.sub(r'(\d+)\s*km/h', lambda m: f"{m.group(1)} kilometri pe oră", text)
    text = re.sub(r'km/h', 'kilometri pe oră', text)
    text = re.sub(r'\bkm\b', 'kilometri', text)
    text = re.sub(r'\bm/h\b', 'metri pe oră', text)
    text = re.sub(r'\bcm\b', 'centimetri', text)
    text = re.sub(r'\bml\b', 'mililitri', text)
    text = re.sub(r'\bl\b(?![a-z])', 'litri', text)
    text = re.sub(r'\bkg\b', 'kilograme', text)
    text = re.sub(r'\bg\b(?![a-z])', 'grame', text)
    text = re.sub(r'\bmg\b', 'miligrame', text)
    text = re.sub(r'\b°C\b', 'grade Celsius', text)
    text = re.sub(r'\bC\b', 'Celsius', text)
    text = re.sub(r'\$(\d+)', lambda m: f"{m.group(1)} dolari", text)
    text = re.sub(r'€(\d+)', lambda m: f"{m.group(1)} euro", text)
    text = re.sub(r'(\d+)€', lambda m: f"{m.group(1)} euro", text)
    text = re.sub(r'\be\.g\.\b', 'de exemplu', text)
    text = re.sub(r'\bi\.e\.\b', 'adică', text)
    text = re.sub(r'\betc\.\b', 'șametera', text)
    text = re.sub(r'\betc\b', 'și așa mai departe', text)
    text = re.sub(r'\bdr\.\b', 'doctor', text)
    text = re.sub(r'\bDl\b', 'domnul', text)
    text = re.sub(r'\bD-na\b', 'doamna', text)
    text = re.sub(r'\bnr\.\b', 'numărul', text)
    text = re.sub(r'\bTel:\s*', 'telefon ', text)
    text = re.sub(r'\bwww\.\b', 'dublu ve dublu ve dublu ve punct ', text)
    text = re.sub(r'\bhttps?://', '', text)
    text = re.sub(r'\.ro\b', ' punct ro', text)
    text = re.sub(r'\.com\b', ' punct com', text)
    text = re.sub(r'\.org\b', ' punct org', text)
    text = re.sub(r'\b(\d{1,2})/(\d{1,2})/(\d{4})\b', lambda m: f"{m.group(1)} {_month_ro(int(m.group(2)))} {m.group(3)}", text)
    text = re.sub(r'\b(\d{1,2}):(\d{2})\b', lambda m: f"{m.group(1)} și {m.group(2)} minute", text)
    text = re.sub(r'(\d+)\s*x\s*(\d+)', lambda m: f"{m.group(1)} pe {m.group(2)}", text)
    text = re.sub(r'\+', 'plus', text)
    text = re.sub(r'=', 'egal', text)
    text = re.sub(r'<', 'mai mic decât', text)
    text = re.sub(r'>', 'mai mare decât', text)
    text = re.sub(r'&', 'și', text)
    text = re.sub(r'@', 'la', text)
    text = re.sub(r'#', 'hash ', text)
    text = re.sub(r'\.\.\.', ' punct punct punct', text)
    text = re.sub(r'\.\.(?!\.)', ' punct punct', text)
    text = re.sub(r'[-–—]', ' ', text)
    text = re.sub(r'\*', ' ', text)
    text = re.sub(r'\*\*', ' ', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'`(.+?)`', r'\1', text)
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()


def _month_ro(month_num):
    months = {
        1: 'ianuarie', 2: 'februarie', 3: 'martie', 4: 'aprilie',
        5: 'mai', 6: 'iunie', 7: 'iulie', 8: 'august',
        9: 'septembrie', 10: 'octombrie', 11: 'noiembrie', 12: 'decembrie'
    }
    return months.get(month_num, str(month_num))


def synthesize_to_wav_bytes(tts, text):
    chunks = list(tts.synthesize(text))
    if not chunks:
        return b""
    
    audio_data = b"".join(chunk.audio_int16_bytes for chunk in chunks)
    sample_rate = chunks[0].sample_rate
    sample_width = 2  # 16-bit
    num_channels = 1
    
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(num_channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data)
    
    return buf.getvalue()


class TTSHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
            return
        
        if parsed.path == "/speak":
            params = urllib.parse.parse_qs(parsed.query)
            text = params.get("text", [None])[0]
            if not text:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "text parameter required"}).encode())
                return
            
            try:
                tts = get_tts()
                spoken_text = verbalize_ro(text)
                wav_bytes = synthesize_to_wav_bytes(tts, spoken_text)
                
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(wav_bytes)))
                self.end_headers()
                self.wfile.write(wav_bytes)
            except Exception as e:
                print(f"TTS error: {e}", file=sys.stderr)
                import traceback; traceback.print_exc()
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        
        self.send_response(404)
        self.end_headers()
    
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
            return
        
        text = data.get("text", "")
        if not text.strip():
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "text field required"}).encode())
            return
        
        try:
            tts = get_tts()
            wav_bytes = synthesize_to_wav_bytes(tts, text)
            
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(wav_bytes)))
            self.end_headers()
            self.wfile.write(wav_bytes)
        except Exception as e:
            print(f"TTS error: {e}", file=sys.stderr)
            import traceback; traceback.print_exc()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    def log_message(self, format, *args):
        print(f"[TTS] {args[0]}")


def main():
    parser = argparse.ArgumentParser(description="Piper TTS HTTP Server")
    parser.add_argument("--port", type=int, default=5001, help="Port to listen on")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind to")
    args = parser.parse_args()
    
    print(f"Starting Piper TTS server on {args.host}:{args.port}")
    print("Model: ro_RO-lili-medium")
    
    server = HTTPServer((args.host, args.port), TTSHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.server_close()


if __name__ == "__main__":
    main()