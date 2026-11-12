# Architecture

```
Navigateur ──► Next.js (web :3000) ──/api/* (rewrite)──► FastAPI (api :8000) ──► PostgreSQL
                                                              │                    ▲
                                                              ├──► Redis ◄── Celery beat (tick 5 min)
                                                              │      │
                                                              │      └──► Celery worker ──► sources d'offres
                                                              └──► Claude API (scoring, CV, lettres)      (API officielles)
```

## Choix techniques

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Recharts, lucide | Stack demandée ; le frontend proxifie `/api` → cookies same-origin, pas de CORS, pas de jeton exposé au JavaScript |
| API | FastAPI + Pydantic | Validation stricte des entrées, OpenAPI automatique |
| Données | PostgreSQL + SQLAlchemy 2 (SQLite en dev/tests) | Relationnel (offres ↔ sources ↔ candidatures ↔ documents), JSON pour les structures souples (profil, CV, scores) |
| Tâches | Celery + Redis (worker + beat) | Recherches planifiées, suivi des pages carrières, relances ; le beat déclenche un `tick` toutes les 5 min qui lance ce qui est arrivé à échéance (fréquence par recherche : 6 h / quotidien / hebdo) |
| IA | Claude (`claude-opus-5-5`, configurable), sorties JSON contraintes (structured outputs), repli serveur en cas de refus | Aucune exécution d'outil : le modèle ne fait que renvoyer du JSON validé |
| Documents | Jinja2 → HTML → WeasyPrint (PDF) ; python-docx (DOCX) | Un seul moteur de rendu pour l'aperçu temps réel et le PDF final |

Les tables sont créées au démarrage (`create_all`). Pour faire évoluer le schéma en production, ajoutez Alembic (`alembic init`, `target_metadata = Base.metadata`).

## Flux d'une recherche

1. `SavedSearch` → `SearchQuery` (mots-clés ; à défaut ceux de vos domaines cibles, avec intitulés alternatifs : « technicien d'exploitation », « modern workplace », « analyste SOC »…).
2. Chaque connecteur configuré renvoie des `RawJob` (format pivot).
3. `ingest()` : normalisation (contrat, salaire annualisé, niveau d'études, expérience, télétravail, permis, anglais, date de début, typologie d'entreprise), extraction des compétences indispensables/souhaitées, géocodage, trajet réel, **dédoublonnage**, score.
4. `SearchRun` : statistiques, erreurs par source, rapport texte (« 12 nouvelles offres… dont 4 > 90 % ») ; notifications in-app (+ email/webhook pour les offres ≥ 80).

## Moteur de scoring (hybride)

Barème : compétences 30 · formation 20 · expérience 15 · missions 15 · localisation 10 · contrat & conditions 10.

- **Règles déterministes** (`services/scoring.py`) : taxonomie IT (≈ 50 compétences canoniques et leurs synonymes), crédit 2× pour l'indispensable, 50 % pour une compétence voisine (VMware ↔ Proxmox…), alternance = niveau d'études en cours accepté, intitulés « senior/lead » plafonnés, poste hors IT pénalisé, points bloquants (habilitation, Bac+5 exigé, années d'expérience).
- **Affinage IA** (si clé et score règles ≥ 45) : Claude renvoie des points par critère + justification. Garde-fous : écart borné à ±25 % du barème par critère, score final = moyenne règles/IA, compétences « couvertes » revérifiées contre le profil (les affirmations non vérifiées sont retirées et affichées).
- Catégories : 90+ Excellent · 80–89 Très bon · 70–79 Bon · 60–69 Moyen · < 60 Faible.

## Dédoublonnage

`(source, external_id)` unique → mise à jour « vue le ». Sinon recherche d'une annonce équivalente : même entreprise normalisée (suffixes SA/SAS/Groupe ignorés, variante orthographique ≥ 90 %), intitulé normalisé (H/F, « alternance »… retirés) ≥ 85 %, même lieu, description ≥ 60 % si les deux sont longues. L'annonce canonique conserve toutes ses publications (`OfferSource`) ; une nouvelle date ≥ 14 jours après la première = **republication**. Expiration : statut source (« pourvue »), disparition d'une page carrière ATS, ou non revue depuis 45 jours.

## Career Studio

- **Profil = source de vérité** (`profiles.data`), versionné (`profile_revisions`).
- CV = vue éditable du profil (`cv_versions.content`) + révisions (`cv_revisions`), comparaison (diff ligne à ligne).
- Adaptation à une offre : règles (réordonner rubriques/compétences/expériences, formation en tête pour l'alternance, titre ciblé, mots-clés possédés) puis reformulation IA rattachée à une expérience existante ; toute puce citant une compétence absente du profil est **rejetée**.
- Lettres/messages : 5 styles, accroches génériques interdites, analyse (personnalisation, pertinence, qualité, originalité, cohérence CV, formulations génériques).
- Validation : copie figée + PDF/DOCX dans `storage/applications/<user>/<application>/`.
