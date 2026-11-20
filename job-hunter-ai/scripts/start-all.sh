#!/bin/sh
# Lance l'API (local uniquement) puis le frontend (public, $PORT). Si l'un s'arrête, le conteneur s'arrête.
set -e
cd /app
uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers &
API=$!
if [ "${RUN_WORKER:-false}" = "true" ]; then
  celery -A app.worker.celery_app worker -B -l INFO --concurrency 1 -s /app/storage/celerybeat-schedule &
fi
cd /web
PORT="${PORT:-10000}" node server.js &
WEB=$!
while kill -0 "$API" 2>/dev/null && kill -0 "$WEB" 2>/dev/null; do sleep 5; done
echo "Un processus s'est arrêté : arrêt du conteneur" >&2
exit 1
