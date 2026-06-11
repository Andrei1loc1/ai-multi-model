$ErrorActionPreference = "Stop"

Set-Location -LiteralPath (Join-Path $PSScriptRoot "ocr-service")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OCR Service - Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".venv\Scripts\python.exe") {
    Write-Host "[OK] Virtual environment found." -ForegroundColor Green
} else {
    Write-Host "[SETUP] Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create virtual environment." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Virtual environment created." -ForegroundColor Green
}

Write-Host "[SETUP] Installing dependencies..." -ForegroundColor Yellow
& .venv\Scripts\python.exe -m pip install --upgrade pip *> $null
& .venv\Scripts\python.exe -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Dependencies installed." -ForegroundColor Green

Write-Host ""
Write-Host "[START] Launching OCR service on http://localhost:8001" -ForegroundColor Cyan
Write-Host "        Health check: http://localhost:8001/health" -ForegroundColor DarkGray
Write-Host ""

& .venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001