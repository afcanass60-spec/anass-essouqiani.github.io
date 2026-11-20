FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
# WeasyPrint (PDF) : Pango/HarfBuzz + polices utilisées par les modèles de CV
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 libffi8 shared-mime-info \
      fonts-inter fonts-ibm-plex fonts-lato fonts-open-sans fonts-roboto fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app ./app
RUN useradd --create-home --uid 10001 app && mkdir -p /app/storage && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips '*'"]
