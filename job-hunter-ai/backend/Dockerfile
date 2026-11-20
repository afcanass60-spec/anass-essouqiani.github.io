FROM python:3.13-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
# WeasyPrint (PDF) : Pango/HarfBuzz + polices utilisées par les modèles de CV
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 shared-mime-info fonts-dejavu-core \
    && for pkg in libharfbuzz-subset0 fonts-inter fonts-ibm-plex fonts-lato fonts-open-sans fonts-roboto-unhinted fonts-roboto; do \
         apt-get install -y --no-install-recommends "$pkg" || echo "Paquet optionnel indisponible : $pkg"; \
       done \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app ./app
RUN useradd --create-home --uid 10001 app && mkdir -p /app/storage && chown -R app:app /app
USER app

EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips '*'"]
