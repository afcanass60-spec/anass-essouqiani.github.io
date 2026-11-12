# Job Hunter AI

Agent IA personnel de recherche d'emploi et d'alternance : il collecte des offres auprès de sources **autorisées**, les dédoublonne, les note sur 100 par rapport à votre profil (règles déterministes + Claude), puis vous aide à préparer chaque candidature (CV adapté, lettre, messages, préparation d'entretien) jusqu'au suivi dans un CRM.

> Profil cible configuré : BTS SIO (13,72) · Bachelor Systèmes, Réseaux & Cloud (ESGI Paris, 3e année) · alternance en priorité, CDI/CDD junior · Paris, Île-de-France, Oise.

## Ce qui fonctionne réellement

| Fonction | État | Remarque |
|---|---|---|
| Backend FastAPI + PostgreSQL (SQLite en dev) | ✅ | 29 tests, passent sur SQLite et PostgreSQL 16 |
| Authentification (Argon2, JWT en cookie httpOnly SameSite=Strict, verrouillage après 5 échecs) | ✅ | Premier compte = administrateur, inscriptions fermées ensuite |
| Connecteurs France Travail, La Bonne Alternance, Adzuna, Google Programmable Search | ✅ code + tests | **Clés à fournir** (voir `docs/SOURCES.md`) |
| Pages carrières via API publiques d'ATS (Greenhouse, Lever, SmartRecruiters, Recruitee, Ashby) + schema.org JobPosting | ✅ | Sans clé |
| LinkedIn, Indeed, WTTJ, Apec, HelloWork, JobTeaser, Meteojob, ChooseYourBoss | ⚠️ pas de collecte automatique | Pas d'API publique / CGU : **alertes email (IMAP)** + import par copier-coller |
| Filtres avancés (contrats, rayon, trajet réel, salaire brut/net, date, niveau, typologie d'entreprise, permis, anglais…) | ✅ | Le temps de trajet exige une clé PRIM (IDFM) ou OpenRouteService |
| Scoring /100 (30/20/15/15/10/10) + explication + compétences manquantes, indispensables vs souhaitées | ✅ | IA facultative, bornée et vérifiée |
| Dédoublonnage inter-sources, republications, offres expirées/pourvues | ✅ | |
| Tableau de bord, offres, CRM candidatures (9 statuts, historique, contacts, notes) | ✅ | |
| Career Studio : profil source de vérité, import CV PDF/DOCX, versions + historique + comparaison, 6 modèles, éditeur avec aperçu temps réel, export PDF/DOCX | ✅ | |
| Lettres (5 styles), 6 types de messages, analyses ATS & qualité de lettre | ✅ | Sans clé IA : brouillons structurés **signalés comme tels** |
| Workflow « Préparer ma candidature » → dossier figé par candidature | ✅ | Envoi email uniquement après double confirmation |
| Automatisation (Celery worker + beat, 6 h / quotidien / hebdo), rapports, notifications in-app / email / webhook | ✅ | **Active seulement si worker + beat tournent** — l'interface affiche l'état réel (battement de cœur) |

Aucune annonce fictive n'est jamais créée : la base démarre vide (seules des recherches sauvegardées et une liste d'entreprises cibles sont pré-remplies).

## Démarrage rapide (Docker)

```bash
cd job-hunter-ai
cp .env.example .env
# Générer les secrets :
python3 -c "import secrets;print('SECRET_KEY='+secrets.token_urlsafe(48))" >> .env
python3 -c "from cryptography.fernet import Fernet;print('ENCRYPTION_KEY='+Fernet.generate_key().decode())" >> .env
# Éditer .env : POSTGRES_PASSWORD, ANTHROPIC_API_KEY, clés des sources (au moins une)
docker compose up -d --build
```

Ouvrez <http://localhost:3000>, créez votre compte, complétez **Career Studio → Profil** (adresse de départ, intitulé et dates FedEx, langues…), puis **Recherches & agent → Lancer maintenant**.

## Développement local (sans Docker)

```bash
# Backend
cd backend && python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000        # API : http://localhost:8000/api/docs
python -m pytest -q                              # tests
# Automatisation (Redis requis)
celery -A app.worker.celery_app worker -B -l INFO

# Frontend
cd frontend && npm install && npm run dev        # http://localhost:3000 (proxy /api -> :8000)
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — choix techniques, flux de données, scoring, dédoublonnage
- [`docs/SOURCES.md`](docs/SOURCES.md) — chaque plateforme : méthode, légalité, clés à obtenir
- [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md) — production, HTTPS, sauvegardes, supervision
- [`docs/SECURITE.md`](docs/SECURITE.md) — modèle de menace, injection de prompt, données personnelles
- [`docs/GUIDE.md`](docs/GUIDE.md) — guide d'utilisation pas à pas
