---
title: TTS Romanian
emoji: 🗣️
colorFrom: indigo
colorTo: pink
sdk: docker
app_port: 7860
---

Romanian Text-to-Speech microservice using Piper TTS (lili-medium voice).

## Endpoints

- `GET /health` — Health check
- `POST /speak` — Synthesize speech from text (JSON body: `{"text": "..."}`) returns WAV audio
- `GET /speak?text=...` — Synthesize speech via query parameter

## Voice

Uses `ro_RO-lili-medium` model from [eduardem/piper-tts-romanian](https://huggingface.co/eduardem/piper-tts-romanian).