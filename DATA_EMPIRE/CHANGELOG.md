# Changelog

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Versions : `0.<phase>.<révision>`.

## [0.1.0] — 2026-11-27 — Phase 0 : préparation

### Ajouté
- Projet Godot 4 (`project.godot`) configuré pour le renderer **Compatibility** (Web + iOS),
  étirement `canvas_items/expand`, orientation paysage, MSAA 2x.
- Arborescence complète (`scenes/`, `scripts/{main,world,view,ui,core,systems,entities}`,
  `data/`, `assets/`, `tests/`, `tools/`, `docs/`).
- Scène 3D isométrique de départ, entièrement procédurale :
  - garage (dalle béton, 4 murs avec **découpe automatique** des murs face caméra,
    porte sectionnelle, fenêtre, établi + terminal CRT, étagères, cartons, néon) ;
  - extérieur (pelouse, allée, arbres low-poly) ;
  - rack 12U ouvert avec repères d'unités ;
  - vieux serveur 2U beige avec LED d'alimentation et d'activité animées ;
  - ventilateur sur pied (pales animées) orienté vers le rack ;
  - tableau électrique mural, box internet, câbles d'alimentation et réseau ;
  - éclairage : soleil avec ombres, lampe chaude, halo cyan autour du rack.
- Caméra isométrique orthographique : pan, zoom, rotation par pas de 90°, recentrage ;
  souris, clavier (touches physiques AZERTY/QWERTY), tactile (glisser, pincer), trackpad.
- HUD : carte titre, aide des contrôles, boutons caméra tactiles (56 px), compteur FPS.
- Tests headless (`tests/run_tests.gd`) + mini framework d'assertions : 20 tests
  (structure du projet, scène, caméra, vues d'équipement).
- Outils : `tools/check_environment.ps1`, `tools/run_tests.ps1`, `tools/run_tests.sh`,
  `tools/validate_project.py`, configuration `gdlintrc`.
- Documentation : README, GAME_DESIGN, TECHNICAL_ARCHITECTURE, GAME_BALANCE, ROADMAP,
  SETUP_WINDOWS, EXPORT_GUIDE.

### Vérifié
- 18 scripts GDScript : analyse syntaxique `gdparse` OK, `gdlint` sans erreur.
- Validateur statique : chemins `res://`, ressources des scènes, indentation.

### Non vérifié (à faire sur le PC Windows)
- Exécution dans Godot 4 et passage des 20 tests headless.
- Rendu visuel de la scène.
