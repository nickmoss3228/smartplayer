# syntax=docker/dockerfile:1
# Python, not the backend's Alpine Node image: Praat's wheels are built for glibc.
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOST=0.0.0.0 \
    PORT=8000

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server.py .

RUN useradd --system --uid 10001 worker
USER worker

EXPOSE 8000
CMD ["python", "server.py"]
