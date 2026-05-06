FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# WeasyPrint + OCR system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libcairo2 libgdk-pixbuf-2.0-0 \
      libffi-dev shared-mime-info fonts-inter fonts-jetbrains-mono \
      fonts-noto-core fonts-noto-mono fonts-noto-extra \
      tesseract-ocr tesseract-ocr-eng \
      libgl1 libglib2.0-0 \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --upgrade pip \
 && pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision \
 && pip install .

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

RUN mkdir -p /var/recallai/uploads /var/recallai/results

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
