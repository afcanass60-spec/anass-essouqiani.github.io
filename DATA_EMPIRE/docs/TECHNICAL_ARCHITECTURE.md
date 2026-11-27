# Architecture technique

## 1. Principes

- **Séparation simulation / présentation.** Les règles de jeu (économie, contrats,
  thermique…) sont des scripts `RefCounted` **sans dépendance à la scène 3D** : testables en
  headless, réutilisables tels quels sur iOS, et indépendants du FPS.
- **Données hors du code.** Statistiques des équipements, contrats, incidents, progression :
  fichiers JSON dans `data/`, validés au chargement.
- **Communication par signaux.** Les systèmes émettent (`server_failed`, `money_changed`…),
  les vues et l'UI écoutent. Aucune vue ne modifie l'état de jeu directement : elle émet une
  *intention* (ex. `buy_requested`) traitée par un système.
- **Une responsabilité par script**, pas de dépendance circulaire (sens unique ci-dessous).

## 2. Couches

```
            ┌──────────────── main.gd (racine de composition) ───────────────┐
            │  instancie et relie ; seul endroit qui connaît tout le monde     │
            └─────────────────────────────────────────────────────────────────┘
   UI (scripts/ui)          Monde 3D (scripts/world, scripts/view)
   émet des intentions      affiche l'état, émet des intentions
            │                          │
            ▼                          ▼
   Core (scripts/core) : GameState, SimulationClock, SaveManager, EconomyManager…
            │
            ▼
   Systems (scripts/systems) : règles pures (RackSystem, PowerSystem, ContractSystem…)
            │
            ▼
   Entities (scripts/entities) + Data (data/*.json)
```
Sens des dépendances : du haut vers le bas uniquement. Les couches basses ne connaissent
jamais les vues.

## 3. Ce qui existe en Phase 0

| Fichier | Rôle |
|---|---|
| `scripts/main/main.gd` | relie les signaux du HUD à la caméra |
| `scripts/world/world.gd` | environnement, soleil, garage, disposition de départ |
| `scripts/world/camera_controller.gd` | caméra isométrique orthographique |
| `scripts/view/mesh_factory.gd` | primitives procédurales + cache de matériaux/meshes |
| `scripts/view/visual_style.gd` | palette et dimensions partagées |
| `scripts/view/buildings/garage_view.gd` | garage + découpe des murs face caméra |
| `scripts/view/equipment/*_view.gd` | rack, serveur, ventilateur, tableau, box |
| `scripts/ui/hud_controller.gd` | HUD (signaux uniquement) |

Écart assumé par rapport à l'arborescence initiale : ajout de `scripts/view/` (présentation
pure) et `scripts/main/`, pour garder `entities/` réservé aux **données** de jeu.

## 4. Conventions de code

- GDScript typé (`var x: int`, `-> void`), indentation **tabulations**, `snake_case`
  (fichiers, fonctions, variables), `PascalCase` (nœuds, enums), `UPPER_SNAKE` (constantes).
- Pas de `class_name` : dépendances explicites via `const X := preload("res://…")`
  (évite les collisions globales et le cache de classes à régénérer en CI headless).
- Membres privés préfixés `_`. Commentaires de doc `##` en tête de chaque script.
- Aucune valeur d'équilibrage en dur : `data/*.json` ou constantes nommées documentées.
- Lint : `gdlint` (config `gdlintrc`, lignes ≤ 160). Formatage : `gdformat --line-length 160`.
- Commits : un commit par étape cohérente, message `Phase N: …`.

## 5. Simulation (Phase 2+)

- `SimulationClock` : **pas fixe** (ex. 1 tick = 1 s de jeu) accumulé depuis `_process`,
  avec plafond de ticks par frame (anti « spirale de la mort »). Économie, températures et
  incidents ne dépendent **jamais** du FPS.
- Vitesses ×1 / ×2 / ×4 = plus de ticks par seconde réelle, même logique.
- RNG des incidents : `RandomNumberGenerator` à graine sauvegardée → reproductible en test.
- Progression hors ligne : même moteur, ticks agrégés (pas grossier) sur la durée écoulée,
  **plafonnée** (ex. 8 h), incidents hors ligne limités et résumés au retour.

## 6. Sauvegarde (Phase 5)

- Fichier unique `user://savegame.json` (Web : IndexedDB ; iOS : sandbox de l'app).
- Champ `save_version` entier + chaîne de migrations `migrate_v1_to_v2()`… appliquées au chargement.
- Écriture atomique (fichier temporaire puis renommage) + copie `.bak` de la précédente.
- Données corrompues → chargement du `.bak`, sinon nouvelle partie + message ; jamais de crash.
- `last_saved_unix` pour le calcul du temps hors ligne (horloge système, plafonnée, et
  protégée contre les retours dans le temps).

## 7. Tests

- `tests/run_tests.gd` : runner headless maison (aucun addon), suites `tests/test_*.gd`.
- Un test sans assertion échoue (détecte un test interrompu par une erreur de script).
- `tools/run_tests.ps1` échoue aussi si la sortie contient `SCRIPT ERROR`.
- `tools/validate_project.py` : vérifications statiques sans Godot (chemins, scènes, JSON).

## 8. Performance (Web / mobile)

- Renderer Compatibility, ombres d'un seul soleil (orthogonales), MSAA 2x, pas de SSAO/SSR.
- Matériaux et meshes partagés via `MeshFactory` (moins de changements d'état GPU).
- Petits détails sans ombre portée. Serveur éteint = `set_process(false)`.
- Au-delà de ~200 serveurs visibles : passage à `MultiMeshInstance3D` (Phase 6/8).
- Budget cible : 60 FPS desktop, ≥ 30 FPS mobile, < 300 draw calls au chapitre 1.

## 9. Extensions futures (non développées)

Classements, défis hebdomadaires, appels d'offres partagés : interface `LeaderboardService`
avec une implémentation locale (`LocalLeaderboard`) ; un backend gratuit éventuel ne sera
étudié qu'après validation du prototype. Aucune dépendance réseau dans le cœur du jeu.

## 10. Risques techniques identifiés

| Risque | Impact | Mitigation |
|---|---|---|
| Godot non exécuté pendant la Phase 0 (environnement cloud) | erreurs non détectées | gdparse/gdlint + validateur ; **tests à lancer sur le PC** avant Phase 1 |
| Écarts de rendu Compatibility vs Forward+ | aspect différent | Compatibility utilisé dès le début, aucun effet Forward+ |
| Glow limité en Compatibility selon version | LED moins brillantes | effet purement cosmétique, rien n'en dépend |
| Sauvegarde Web effaçable par le navigateur | perte de progression | export/import manuel du fichier de sauvegarde (Phase 5) |
| Export iOS impossible sous Windows | blocage Phase 8 | documenté : Mac/Xcode ou CI macOS ; développement inchangé |
| Performance avec centaines de serveurs | FPS mobile | MultiMesh + LOD prévus |
| Triche sur l'horloge système (idle) | économie cassée | plafond hors ligne, détection de retour arrière |
