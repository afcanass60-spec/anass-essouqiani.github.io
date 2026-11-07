# Architecture technique

## Stack

| Couche | Choix |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Framer Motion |
| Données | Local-first (`localStorage`) + Supabase (PostgreSQL, Auth, RLS) pour les comptes |
| IA | Couche de services serveur (`src/server/ai`) : Claude (SDK officiel) ou API compatible OpenAI |
| Audio | Web Speech API (synthèse + reconnaissance), MediaRecorder (réécoute) |
| PWA | `manifest.webmanifest` + service worker (`public/sw.js`) |
| Tests | Vitest (unitaires), PostgreSQL réel (`tests/db`), Playwright (`tests/e2e`) |

## Organisation du code

```
src/
  app/                 Pages (App Router)
    page.tsx           Landing
    login, signup, reset-password
    (app)/             Toutes les pages de l'application (AppShell : sidebar, topbar, navigation mobile)
    api/ai/[task]      Route IA unique (chat, report, writing, speaking, free, word-use, define)
    api/ai/status      État réel de la connexion IA (sans secret)
  content/             Contenu pédagogique typé (grammaire, vocabulaire, écoutes, textes, sujets, examens, parcours, référentiel)
  lib/
    types.ts           Types du domaine
    state.ts           État de l'apprenant (versionné, migrable)
    engine/            Moteur pédagogique pur et testé :
      answer.ts          correction automatique (normalisation, contractions, variantes UK/US)
      srs.ts             répétition espacée SM-2 + révision des items ratés
      actions.ts         mutations (tentatives, XP, séries, vocabulaire, progression)
      mastery.ts         estimation par compétence, objectifs CECRL, détection des faiblesses
      progression.ts     déblocage, boss, examens de niveau
      recommend.ts       recommandations, séance quotidienne
      quests.ts, achievements.ts, xp.ts, placement.ts, speech.ts, exam.ts, merge.ts
    store.tsx          Store React (état local persistant, sync Supabase, toasts, temps actif)
    sync/              Correspondance état ⇄ tables, push/pull Supabase
    supabase/          Clients navigateur et serveur
    audio.ts           Hooks TTS / reconnaissance / enregistrement
  server/ai/           Fournisseurs IA, tâches (prompts + schémas), garde (auth + limite de débit), normalisation
  components/          UI (design system), composants d'apprentissage, shell
supabase/              Migration SQL + seed généré
tests/                 unit/, db/, e2e/
```

## Flux de données

1. Toute action d'apprentissage appelle `act(mutator)` : le store clone l'état, applique une mutation pure du moteur (`recordAttempt`, `recordVocab`…), vérifie les badges, enregistre localement (débounce 250 ms, flush à la fermeture) puis planifie un **push** Supabase (2,5 s) si l'utilisateur est connecté.
2. Le push est **incrémental et idempotent** : `stateToRows(state, userId, lastPushAt)` produit des lignes par table, envoyées en `upsert` dans l'ordre des clés étrangères.
3. À la connexion : pull de toutes les tables → `rowsToState` → `mergeStates(local, remote)` (union des journaux, enregistrement le plus récent, XP recalculée depuis les journées pour éviter tout double comptage) → push complet.
4. Le contenu pédagogique est embarqué dans le bundle (rapide, hors ligne) et **également** chargé en base (`seed.sql`) pour l'intégrité référentielle et une future administration.

## IA

- `getProvider()` choisit le fournisseur selon `AI_PROVIDER`. Changer de fournisseur = changer de variables d'environnement.
- Chaque tâche définit : un schéma d'entrée **zod**, un prompt système (personnage, mode, niveau CECRL, points faibles), un **schéma JSON de sortie**. Les sorties sont bornées et nettoyées (`normalize.ts`).
- Claude : sorties structurées (`output_config.format`), effort bas pour la réactivité, repli serveur automatique en cas de refus.
- Garde : si Supabase est configuré, le jeton d'accès est vérifié côté serveur ; limite de débit par utilisateur/IP.
- Le client interroge `/api/ai/status` : si l'IA n'est pas configurée, les fonctionnalités concernées sont désactivées et l'explique.

## Sécurité

- Aucune clé secrète côté client ; seules les variables `NEXT_PUBLIC_SUPABASE_*` (clé anonyme, protégée par RLS) sont publiques.
- RLS sur toutes les tables de l'apprenant (`user_id = auth.uid()`), contrôles croisés (messages ↔ conversation, résultats ↔ examen), contenu en lecture seule.
- Contraintes de validation (bornes, longueurs, énumérations) dans le schéma SQL ; validation zod des entrées IA.
- En-têtes de sécurité (`X-Frame-Options`, `nosniff`, `Permissions-Policy` limitant le micro au site).
- Classement exposé par une fonction `security definer` qui ne renvoie que pseudo/XP des volontaires, aux seuls utilisateurs connectés.

## Accessibilité

Lien d'évitement, navigation clavier complète (cartes de la carte du monde focusables, items de lecture activables au clavier), `aria-current`, `aria-live` pour les retours, `role="progressbar"`, tableaux de données masqués pour les graphiques, `lang="en"` sur tout le contenu anglais (lecteurs d'écran), `prefers-reduced-motion` respecté, contrastes des tokens vérifiés en thème sombre et clair.
