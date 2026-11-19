FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MPLCONFIGDIR=/tmp/matplotlib \
    YOLO_CONFIG_DIR=/tmp/ultralytics

WORKDIR /app

# OpenCV and MediaPipe need these shared libraries on Linux.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libgomp1 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements.txt
# Use CPU wheels: Render does not need the large CUDA dependencies.
RUN pip install torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r backend/requirements.txt

COPY backend backend
COPY ai_engine ai_engine
COPY storage/seeds storage/seeds
COPY bestSOS.pt bestSOS.pt

CMD ["sh", "-c", "python -m backend.app.db_init && exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
