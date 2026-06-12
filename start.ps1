#!/usr/bin/env pwsh
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║     AI Multi-Model  -  Startup Script        ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeOk = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
if (-not $nodeOk) {
    Write-Host "[ERROR] Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Node.js found" -ForegroundColor Green

# Check Python
$pythonOk = $null -ne (Get-Command python -ErrorAction SilentlyContinue)
if (-not $pythonOk) {
    Write-Host "[WARN] Python not found - OCR and TTS services will not start" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Python found" -ForegroundColor Green
}

# Install npm dependencies if needed
if (-not (Test-Path "$Root\node_modules")) {
    Write-Host ""
    Write-Host "[SETUP] Installing npm dependencies..." -ForegroundColor Cyan
    Set-Location $Root
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "[OK] npm dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host " ──────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "  Starting services..." -ForegroundColor White
Write-Host " ──────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# ─── OCR Service (port 8001) ───
if ($pythonOk) {
    Write-Host "[1/3] Starting OCR service on http://localhost:8001" -ForegroundColor Cyan
    $ocrVenv = Join-Path $Root "ocr-service\.venv\Scripts\python.exe"
    if (Test-Path $ocrVenv) {
        Start-Process -FilePath $ocrVenv -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001" -WorkingDirectory "$Root\ocr-service" -NoNewWindow
    } else {
        Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8001" -WorkingDirectory "$Root\ocr-service" -NoNewWindow
    }
    Start-Sleep -Seconds 3
} else {
    Write-Host "[1/3] Skipping OCR service (Python not found)" -ForegroundColor Yellow
}

# ─── TTS Service (port 5001) ───
if ($pythonOk) {
    Write-Host "[2/3] Starting TTS service on http://localhost:5001" -ForegroundColor Cyan
    Start-Process -FilePath "python" -ArgumentList "$Root\tts-service\server.py", "--port", "5001", "--host", "127.0.0.1" -WorkingDirectory "$Root\tts-service" -NoNewWindow
    Start-Sleep -Seconds 3
} else {
    Write-Host "[2/3] Skipping TTS service (Python not found)" -ForegroundColor Yellow
}

# ─── Next.js (port 3000) ───
Write-Host "[3/3] Starting Next.js dev server on http://localhost:3000" -ForegroundColor Cyan
Set-Location $Root
$env:OCR_SERVICE_URL = "http://localhost:8001"
$env:TTS_SERVICE_URL = "http://127.0.0.1:5001"
npx next dev