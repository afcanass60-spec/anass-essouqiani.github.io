# Base de données (Supabase / PostgreSQL)

Schéma : `supabase/migrations/20261107000000_init.sql`. Contenu : `supabase/seed.sql` (généré par `npm run db:seed`).

## Contenu pédagogique (lecture publique)

| Table | Description |
|---|---|
| `learning_levels` | B1, B1+, B2, B2+, C1 |
| `courses` | Un cours par niveau |
| `chapters` | Chapitres (histoire, boss) |
| `lessons` | Leçons (sujet de grammaire, thème de vocabulaire, ressources, objectifs) |
| `grammar_topics` | Cours de grammaire (explications FR/EN, formes, exemples, erreurs) |
| `exercises` | Séries d'exercices (grammaire par difficulté, écoutes, textes, sujets, examens, placement) |
| `questions` | Items (type, compétence, niveau, sujet, objectif, contenu et réponses) |
| `vocabulary` | Banque de mots (IPA UK/US, définition, traduction, exemple, synonymes…) |
| `achievements`, `daily_quests` | Catalogues des badges et quêtes |

## Données de l'apprenant (RLS : `user_id = auth.uid()`)

| Table | Description |
|---|---|
| `profiles` | Pseudo, réglages, XP, niveau de joueur, série, niveau CECRL, placement, validations, opt-in classement (créé par trigger à l'inscription) |
| `user_vocabulary` | Cartes SRS (facilité, intervalle, échéance, compteurs reconnaissance/rappel/contexte/usage, mots personnels) |
| `user_progress` | Leçons, cours, écoutes, lectures, boss (meilleur score, essais, date de validation) |
| `exercise_attempts` | Journal de chaque réponse (item, compétence, niveau, sujet, objectif, résultat) |
| `learning_sessions` | Statistiques par jour (XP, temps par module, compteurs) |
| `user_achievements`, `user_quests` | Badges obtenus, quêtes réclamées |
| `conversations`, `conversation_messages` | Conversations IA et bilans |
| `writing_submissions`, `speaking_attempts` | Productions et retours |
| `exam_attempts`, `exam_results` | Examens (blancs, niveau, boss) et résultats par compétence |
| `error_history` | Historique des erreurs (personnalisation) |
| `revision_schedule` | Révision espacée des items ratés |

`users` correspond à `auth.users` (Supabase Auth).

## Sécurité

- RLS activée sur **toutes** les tables ; contenu : `select` pour `anon` et `authenticated` uniquement.
- Données apprenant : politique `for all` restreinte à `user_id = auth.uid()` ; vérifications croisées pour `conversation_messages` et `exam_results`.
- Contraintes `check` (bornes, longueurs, énumérations), clés étrangères, index sur les accès fréquents (échéances, historique, sujets).
- `leaderboard(limit)` : `security definer`, ne renvoie ni identifiant ni email, exécutable uniquement par `authenticated`.

Ces garanties sont vérifiées par `npm run test:db` sur un PostgreSQL réel (isolation lecture/écriture entre deux utilisateurs, injection dans la conversation d'autrui, contraintes, classement).
