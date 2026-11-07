# Design system

## Identité

Fond sombre élégant (thème clair disponible), bleu électrique `#3d7bff`, violet `#9b6bff`, touches de vert `#2fd58b`. Dégradé héros : bleu → violet → vert. Typographies : **Space Grotesk** (titres), **Inter** (texte). Cartes arrondies (20 px), ombres douces, fond d'ambiance en dégradés radiaux.

## Tokens (`src/app/globals.css`)

| Token | Rôle |
|---|---|
| `--bg`, `--bg-elevated`, `--surface`, `--surface-2` | Fonds et surfaces |
| `--border`, `--border-strong` | Bordures |
| `--text`, `--text-muted`, `--text-faint` | Texte |
| `--primary`, `--violet`, `--green`, `--amber`, `--red` (+ `-soft`) | Couleurs sémantiques |
| `--grad-hero`, `--grad-card` | Dégradés |

Les tokens sont exposés à Tailwind (`bg-surface`, `text-muted`, `text-primary`, `bg-green-soft`…). Le thème est appliqué par `data-theme` sur `<html>` avant le premier rendu (script inline, pas de flash).

## Composants (`src/components/ui`)

`Button`, `LinkButton`, `Card`, `Pill`, `LevelPill`, `Progress`, `Ring`, `Stat`, `Tabs`, `Notice`, `Empty`, `PageHeader`, `Spinner`, `Loading`, `Icon` (≈ 70 icônes originales, trait 1.8).

Composants d'apprentissage (`src/components/learn`) : `ExerciseSet`/`AutoExercise` (6 types d'items), `VocabSession`, `GrammarExplanation`, `ListeningPlayer`, `ReadingView`, `SpeakingTaskView`, `WritingTaskView`, `ExamRunner`, `Scenes` (illustrations originales).

## Mise en page

- Ordinateur : barre latérale fixe (256 px) + barre supérieure (série, XP, niveau).
- Mobile/tablette : barre supérieure compacte + **navigation inférieure** (Accueil, Carte, Apprendre, Parler, Moi), zones sûres iOS respectées.
- Largeur de contenu max 1152 px ; marges 16 px sur mobile ; aucun défilement horizontal (vérifié en E2E).

## Mouvement

Framer Motion pour les transitions d'items, toasts (XP, badges) et combats de boss ; durées courtes (≤ 300 ms) ; désactivées si `prefers-reduced-motion`.
