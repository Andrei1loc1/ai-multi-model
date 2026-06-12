FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir piper-tts==1.4.2 httpx

COPY server.py .

RUN mkdir -p models/voices/lili && \
    pip install --no-cache-dir huggingface-hub && \
    python -c "from huggingface_hub import hf_hub_download; \
        hf_hub_download('eduardem/piper-tts-romanian', 'voices/lili/ro_RO-lili-medium.onnx', local_dir='models'); \
        hf_hub_download('eduardem/piper-tts-romanian', 'voices/lili/ro_RO-lili-medium.onnx.json', local_dir='models')" && \
    pip uninstall -y huggingface-hub

EXPOSE 7860

CMD ["python", "server.py", "--port", "7860", "--host", "0.0.0.0"]