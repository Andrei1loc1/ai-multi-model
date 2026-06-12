@echo off
echo Starting Piper TTS Service...
echo Model: ro_RO-romanian-medium (will download on first run)
echo Port: 5001
echo.
python "%~dp0server.py" --port 5001 --host 127.0.0.1