# Déploiement

## Services (docker-compose.yml)

| Service | Rôle |
|---|---|
| `db` | PostgreSQL 17 (volume `pgdata`) |
| `redis` | File de tâches Celery (AOF activé) |
| `api` | FastAPI (uvicorn), crée les tables au démarrage |
| `worker` | Exécute recherches, suivi des pages carrières, maintenance |
| `beat` | Planificateur : `tick` toutes les 5 min (battement de cœur + recherches échues), maintenance toutes les 6 h |
| `web` | Next.js (standalone), seul service exposé (127.0.0.1:3000) |

**Sans `worker` ET `beat`, aucune recherche automatique n'a lieu.** L'interface l'indique (tableau de bord, Recherches, Paramètres) grâce au battement de cœur écrit par `tick` ; il est considéré inactif après 15 min sans battement.

## Mise en production

1. `.env` : `ENVIRONMENT=production`, `SECRET_KEY` (≥ 32 caractères), `ENCRYPTION_KEY` (Fernet), `POSTGRES_PASSWORD`, `COOKIE_SECURE=true`, `FRONTEND_ORIGIN=https://votre-domaine`. L'API refuse de démarrer en production sans ces secrets.
2. Placez un reverse proxy HTTPS devant `web` (Caddy : `votre-domaine { reverse_proxy 127.0.0.1:3000 }`).
3. `docker compose up -d --build`, puis `docker compose logs -f api worker beat`.
4. La documentation OpenAPI est désactivée en production.

## Journalisation

Logs JSON sur la sortie standard (horodatage, niveau, `request_id`, chemin, statut, durée). Chaque réponse porte `X-Request-ID`. Actions sensibles (connexion, échecs, validation et envoi de candidature, changement de mot de passe) dans la table `audit_logs`.

## Sauvegardes

`./scripts/backup.sh /srv/backups` : dump PostgreSQL (`pg_dump -Fc`) + archive des documents de candidature, rétention 30 jours. À planifier en cron quotidien. Restauration : voir la fin du script. Testez une restauration au moins une fois.

## Coûts IA

Le scoring IA n'est appelé que pour les offres dont le score déterministe dépasse `LLM_SCORING_MIN_RULE_SCORE` (45 par défaut) et une seule fois par offre (les doublons ne sont pas réanalysés sauf si une source apporte une description plus complète). Désactivable via `LLM_SCORING_ENABLED=false` ; l'analyse reste disponible à la demande (« Analyser avec l'IA »).

## Évolution du schéma

Le schéma est créé par `create_all`. Avant toute modification de modèle en production : `pip install alembic && alembic init migrations`, pointer `target_metadata` sur `app.db.Base.metadata`, générer une migration initiale « baseline », puis une migration par changement.
