#!/usr/bin/env bash
# Sauvegarde PostgreSQL + documents de candidature. Usage : ./scripts/backup.sh [dossier]
# À planifier (ex. cron quotidien) : 30 2 * * * cd /chemin/job-hunter-ai && ./scripts/backup.sh /srv/backups
set -euo pipefail
DEST="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
docker compose exec -T db pg_dump -U jobhunter -Fc jobhunter > "$DEST/db-$STAMP.dump"
docker compose run --rm -T --no-deps -v "$(realpath "$DEST")":/backup api \
  tar czf "/backup/storage-$STAMP.tgz" -C /app storage
find "$DEST" -name 'db-*.dump' -mtime +30 -delete
find "$DEST" -name 'storage-*.tgz' -mtime +30 -delete
echo "Sauvegarde OK : $DEST (db-$STAMP.dump, storage-$STAMP.tgz)"
# Restauration : docker compose exec -T db pg_restore -U jobhunter -d jobhunter --clean < db-XXXX.dump
