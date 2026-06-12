@echo off
setlocal enabledelayedexpansion
title AI Multi-Model - All Services
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║     AI Multi-Model  -  Startup Script        ║
echo  ╚══════════════════════════════════════════════╝
echo.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found

:: Check Python
where python >nul 2>&1
if errorlevel 1 (
    echo [WARN] Python not found - OCR and TTS services will not start
    set "PYTHON_OK=0"
) else (
    echo [OK] Python found
    set "PYTHON_OK=1"
)

:: Check if node_modules exist
if not exist "%ROOT%\node_modules" (
    echo.
    echo [SETUP] Installing npm dependencies...
    cd /d "%ROOT%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
    echo [OK] npm dependencies installed
)

echo.
echo ──────────────────────────────────────────────
echo  Starting services...
echo ──────────────────────────────────────────────
echo.

:: ─── OCR Service (port 8001) ───
if "%PYTHON_OK%"=="1" (
    echo [1/3] Starting OCR service on http://localhost:8001
    start "OCR Service" cmd /c "cd /d "%ROOT%\ocr-service" && if exist .venv\Scripts\python.exe (.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001) else (python -m uvicorn app.main:app --host 127.0.0.1 --port 8001)"
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] Skipping OCR service (Python not found)
)

:: ─── TTS Service (port 5001) ───
if "%PYTHON_OK%"=="1" (
    echo [2/3] Starting TTS service on http://localhost:5001
    start "TTS Service" cmd /c "cd /d "%ROOT%\tts-service" && python server.py --port 5001 --host 127.0.0.1"
    timeout /t 3 /nobreak >nul
) else (
    echo [2/3] Skipping TTS service (Python not found)
)

:: ─── Next.js (port 3000) ───
echo [3/3] Starting Next.js dev server on http://localhost:3000
cd /d "%ROOT%"
set "OCR_SERVICE_URL=http://localhost:8001"
set "TTS_SERVICE_URL=http://127.0.0.1:5001"
call npx next dev

echo.
echo ──────────────────────────────────────────────
echo  All services stopped.
echo ──────────────────────────────────────────────
pause