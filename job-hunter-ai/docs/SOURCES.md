# Sources d'offres — méthode, légalité, configuration

Principe : uniquement des **API officielles**, des **flux publics prévus pour être consommés**, ou **vos propres emails**. Jamais de contournement d'anti-bot, de connexion simulée ni de scraping de sites dont les CGU l'interdisent. Le module `services/urlsafe.py` refuse techniquement de récupérer les domaines concernés.

## Sources automatisées

| Source | Variables `.env` | Où obtenir l'accès | Notes |
|---|---|---|---|
| **France Travail** — Offres d'emploi v2 | `FRANCE_TRAVAIL_CLIENT_ID`, `FRANCE_TRAVAIL_CLIENT_SECRET` | francetravail.io → espace développeur → créer une application → souscrire « Offres d'emploi v2 » | Gratuit. Filtre alternance via `natureContrat` (E2 apprentissage, FS professionnalisation). Inclut de nombreuses offres partenaires. |
| **La Bonne Alternance** (API apprentissage de l'État) | `LBA_API_TOKEN` | api.apprentissage.beta.gouv.fr → demander un jeton | Spécialisée alternance ; recherche par rayon autour de chaque lieu, codes ROME informatique (M1801, M1810, I1401, M1802, M1805, M1806). |
| **Adzuna** | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | developer.adzuna.com | Agrégateur (beaucoup d'offres de jobboards). Descriptions tronquées ; salaires parfois estimés (signalé). |
| **Google Programmable Search** | `GOOGLE_CSE_API_KEY`, `GOOGLE_CSE_CX` | programmablesearchengine.google.com + Google Cloud | Trouve des pages carrières. Les pages autorisées (robots.txt) sont lues via schema.org/JobPosting ; les autres résultats restent des « pistes ». Google restreint cette API pour les nouveaux comptes : vérifiez sa disponibilité. |
| **Pages carrières (ATS)** | aucune | Page « Entreprises » : collez l'URL carrière | API publiques documentées : Greenhouse, Lever, SmartRecruiters, Recruitee, Ashby. Sinon : offres schema.org/JobPosting de la page, ou détection de changement. |
| **Alertes email** | `IMAP_HOST`, `IMAP_USER`, `IMAP_PASSWORD`, `IMAP_FOLDER` | Votre messagerie (mot de passe d'application recommandé) | Lecture seule (`BODY.PEEK`). Couvre LinkedIn, Indeed, WTTJ, Apec, HelloWork, JobTeaser, Meteojob, ChooseYourBoss. |

## Plateformes sans collecte automatique

| Plateforme | Pourquoi | Méthode proposée |
|---|---|---|
| LinkedIn Jobs | Pas d'API de recherche publique ; scraping interdit par les CGU | Alertes LinkedIn → IMAP ; import copier-coller (bouton « Importer ») |
| Indeed | API Publisher fermée ; CGU | Alertes email ; nombreuses offres déjà présentes via France Travail/Adzuna |
| Welcome to the Jungle | Pas d'API candidats | Alertes email ; suivre les entreprises sous Lever/Greenhouse/Welcome Kit |
| Apec | Pas d'API publique particuliers | Alertes email Apec |
| HelloWork, Meteojob, ChooseYourBoss | Pas d'API publique | Alertes email |
| JobTeaser | Réservé aux étudiants des écoles partenaires (connexion) | Alertes JobTeaser via votre compte ESGI |
| Sites Workday et autres ATS fermés | Pas d'API publique documentée | Suivi de la page (détection de changement) + import manuel |

Les pistes issues d'alertes email ont le badge « Piste à compléter » : collez le texte de l'annonce sur sa fiche pour obtenir une analyse complète.

## Recommandation de mise en route

1. France Travail + La Bonne Alternance (gratuits, officiels, très pertinents pour l'alternance en Île-de-France/Oise).
2. Alertes email LinkedIn/WTTJ/Apec/JobTeaser dans un dossier dédié + IMAP.
3. Ajouter vos 20 entreprises prioritaires avec leur URL carrière et cocher « Surveiller ».
4. Adzuna pour élargir ; Google CSE en dernier.
