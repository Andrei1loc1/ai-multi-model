$env:PIPER_MODEL = "ro_RO-romanian-medium"
Write-Host "Starting Piper TTS Service..."
Write-Host "Model: ro_RO-romanian-medium (will download on first run)"
Write-Host "Port: 5001"
Write-Host ""
python "$PSScriptRoot\server.py" --port 5001 --host 127.0.0.1