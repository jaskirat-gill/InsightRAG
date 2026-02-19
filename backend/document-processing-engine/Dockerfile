FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Layer 1: CPU-only PyTorch + torchvision (must match to avoid ABI conflicts)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Layer 2: Heavy ML deps (cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Layer 3: App code (fast rebuild on code changes)
COPY . .

CMD ["celery", "-A", "worker", "worker", "--loglevel=info", "--concurrency=2"]
