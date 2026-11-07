# English Quest — de B1 à C1

Plateforme web complète d'apprentissage de l'anglais, du niveau **B1 au niveau C1** (CECRL), qui combine un vrai parcours pédagogique, des modules d'entraînement par compétence, un professeur IA et une gamification de type RPG.

> Phases livrées : **1 à 6** (fondations, moteur pédagogique, modules interactifs, IA, gamification, évaluation) et une partie de la **phase 7** (tests, sécurité, responsive). Voir [docs/ROADMAP.md](docs/ROADMAP.md) pour ce qui reste.

## Démarrage rapide

```bash
cd english-quest
npm install
cp .env.example .env.local   # facultatif : IA et Supabase
npm run dev                  # http://localhost:3000
```

Sans aucune variable d'environnement, l'application fonctionne **en mode local** : la progression est enregistrée dans le navigateur, et les fonctions IA (conversation, correction de l'écrit, analyse de l'oral libre) affichent clairement qu'elles ne sont pas connectées — **aucune réponse IA n'est simulée**.

## Ce que contient l'application

| Module | Contenu |
|---|---|
| Parcours CECRL | 5 niveaux (B1, B1+, B2, B2+, C1), 10 chapitres, 20 leçons, 10 boss, 5 examens de validation |
| Test de positionnement | Adaptatif, par compétence (grammaire, vocabulaire, lecture, écoute) |
| Vocabulary Master | 214 mots / phrasal verbs / idiomes / collocations, 12 thèmes, IPA UK/US, audio, synonymes, différences UK/US ; répétition espacée SM-2 (reconnaissance → rappel → contexte → usage) |
| Grammar Academy | 19 cours (tous les temps, present perfect, conditionnels 0-3 et mixtes, passif, discours indirect, relatives, modaux, gérondif/infinitif, inversion, clivées, connecteurs, ponctuation, subjonctif, phrases complexes, nuances) ; explication FR + EN, exemples, erreurs fréquentes, 3 niveaux d'exercices et mini-examen — **~450 items de 6 types** |
| Listening Lab | 10 écoutes (dialogues, réunion, interview, podcast, actualités, débat, négociation, conférence, séminaire), accents UK/US/international, vitesse, sous-titres, transcription masquée, réécoute par passage |
| Speaking Studio | 27 tâches dans les 10 types demandés ; reconnaissance vocale, intelligibilité mot à mot, débit, pauses, réécoute de sa voix ; analyse IA des réponses libres |
| AI Conversation | 6 personnages (Alex, James, Michael, Sarah, Emma, Daniel), 5 modes, corrections en direct, saisie vocale, bilan final (erreurs, mots, expressions, note, exercice personnalisé) |
| Reading Center | 8 textes originaux B1→C1, dictionnaire au toucher (banque + Free Dictionary API + traduction IA), questions d'inférence, résumé corrigé |
| Writing Workshop | 10 sujets (email, lettres, compte rendu, essai, article, rapport, proposition, résumé, texte académique) ; texte original annoté, version corrigée, version améliorée, explication de chaque correction, notes sur 5 critères |
| Exam Center | 4 examens blancs chronométrés (formats inspirés B1/B2/C1 Cambridge et IELTS) + validations de niveau ; résultat par compétence |
| Gamification | XP méritée (pas de farming), niveaux de joueur, séries, 3 quêtes/jour + 4 quêtes/semaine, 16 badges, boss, carte du monde, classement facultatif |
| Personnalisation | Détection des points faibles (exercices + erreurs relevées par l'IA), leçon ciblée, révision des items ratés, vérification de la correction, recommandations, séance quotidienne 30/45/60 min, modes léger/normal/intensif |
| Tableau de bord & stats | Niveau estimé, progression vers C1, courbes des 4 compétences + grammaire/vocabulaire, XP et temps, référentiel d'objectifs CECRL, historique |

Toutes les statistiques proviennent de l'activité réelle ; les niveaux affichés sont des **estimations d'entraînement**, jamais présentées comme des certifications.

## Connecter l'IA

Les appels IA passent exclusivement par les routes serveur `/api/ai/*` (la clé n'est jamais envoyée au navigateur). Deux fournisseurs interchangeables :

- **Claude (Anthropic)** — `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...` (modèle par défaut `claude-opus-5-5`, modifiable avec `AI_MODEL`).
- **Toute API compatible OpenAI** — `AI_PROVIDER=openai-compatible`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`. **Alternative gratuite** : [Ollama](https://ollama.com) en local (`AI_BASE_URL=http://localhost:11434/v1`, `AI_MODEL=llama3.1`).

Les sorties sont structurées (schéma JSON), validées et bornées côté serveur. Si Supabase est configuré, l'IA est réservée aux utilisateurs connectés et limitée à 20 requêtes/minute/utilisateur.

## Connecter Supabase (comptes et synchronisation)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Appliquez le schéma : `supabase/migrations/20261107000000_init.sql` (SQL Editor, ou `supabase db push`).
3. Chargez le contenu : `npm run db:seed` régénère `supabase/seed.sql`, à exécuter ensuite dans le SQL Editor.
4. Renseignez `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Dans Authentication → URL Configuration, ajoutez l'URL du site (pour la confirmation d'email et la réinitialisation du mot de passe).

À la première connexion, la progression faite en mode invité est fusionnée dans le compte. Ensuite chaque modification est poussée (upsert incrémental) et récupérée sur les autres appareils.

## Tests

```bash
npm test            # 33 tests unitaires : moteur, contenu (chaque réponse attendue est vérifiée), sync
npm run test:db     # PostgreSQL réel : migration, seed, RLS, isolation, aller-retour de sync
npm run build && npm run test:e2e   # 14 scénarios Playwright de bout en bout
npm run lint && npm run typecheck
```

`test:db` nécessite un PostgreSQL accessible via `DATABASE_URL` (une base `eq_test` est créée). `test:e2e` démarre `next start` avec un fournisseur IA de test compatible OpenAI (`tests/e2e/mock-ai.cjs`) afin de vérifier le pipeline IA réel (route → validation → interface) ; ce faux fournisseur n'est jamais utilisé par l'application.

## Déploiement

L'application a des routes serveur (IA) : elle se déploie sur **Vercel** (ou tout hébergeur Node.js), pas sur GitHub Pages. Sur Vercel : *Root Directory* = `english-quest`, puis ajoutez les variables d'environnement. Le portfolio présent à la racine de ce dépôt n'est pas modifié.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — architecture technique, flux de données, sécurité
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) — tokens, composants, accessibilité
- [docs/DATABASE.md](docs/DATABASE.md) — schéma relationnel et politiques RLS
- [docs/PEDAGOGY.md](docs/PEDAGOGY.md) — référentiel, progression, évaluation, personnalisation
- [docs/ROADMAP.md](docs/ROADMAP.md) — état par phase et prochaines étapes
