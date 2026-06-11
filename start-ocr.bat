@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0ocr-service"

echo ========================================
echo   OCR Service - Startup Script
echo ========================================
echo.

if exist ".venv\Scripts\python.exe" (
    echo [OK] Virtual environment found.
) else (
    echo [SETUP] Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created.
)

echo [SETUP] Installing dependencies...
.venv\Scripts\python.exe -m pip install --upgrade pip >nul 2>&1
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.

echo.
echo [START] Launching OCR service on http://localhost:8001
echo         Health check: http://localhost:8001/health
echo.
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001