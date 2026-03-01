FROM python:3.11-slim

WORKDIR /app

# Install CPU-only PyTorch first to avoid heavy CUDA downloads
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model (optional but recommended)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy all application files
COPY . .

# Run MCP server
CMD ["python", "server.py"]