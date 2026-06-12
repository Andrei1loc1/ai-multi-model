---
title: OCR Service
emoji: 🔍
colorFrom: blue
colorTo: blue
sdk: docker
app_port: 7860
---

OCR microservice using PaddleOCR + PyMuPDF for PDF and image text extraction.

## Endpoints

- `GET /health` — Health check
- `POST /extract` — Extract text from PDF or image (multipart file upload)
- `POST /vision` — Analyze image via Ollama vision model (requires `OLLAMA_API_KEY` secret)

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `OLLAMA_VISION_ENDPOINT` | Ollama vision API endpoint | No (default: https://ollama.com/api/chat) |
| `OLLAMA_API_KEY` | API key for Ollama vision | No |
| `OLLAMA_VISION_MODEL` | Vision model name | No (default: llava) |