FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire backend directory into /app
COPY . .

# Install dependencies directly into the system python
RUN pip install --no-cache-dir -r requirements.txt

# Create an entrypoint script
RUN chmod +x start.sh

# Cloud Run defines the port to listen on via the PORT env var (default 8080)
ENV PORT=8080

CMD ["./start.sh"]
