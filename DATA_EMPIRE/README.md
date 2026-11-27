# DATA EMPIRE

Jeu **Tycoon 3D isométrique** de gestion d'infrastructures informatiques : partir d'un
garage avec un vieux serveur et bâtir un empire mondial du cloud et de l'IA.

- Moteur : **Godot 4** (≥ 4.4, édition standard GDScript — pas l'édition .NET)
- Langage : **GDScript**
- Rendu : **Compatibility** (OpenGL ES 3 / WebGL 2) — obligatoire pour l'export Web, compatible iOS
- Cible 1 : navigateur Web · Cible 2 : iOS
- Budget : **0 €** — aucune ressource payante, tous les modèles 3D sont générés en code

## État actuel : Phase 0 (préparation) — à valider sur votre PC

| Élément | État |
|---|---|
| Projet Godot, arborescence, conventions | ✅ créé |
| Scène 3D isométrique (garage, rack, serveur, ventilateur, tableau électrique, box internet, câbles) | ✅ écrite, **pas encore exécutée dans Godot** |
| Caméra isométrique (pan, zoom, rotation 90°, souris/clavier/tactile) | ✅ écrite, **pas encore exécutée** |
| Tests automatisés (20 tests headless) | ✅ écrits, **pas encore exécutés** (voir ci-dessous) |
| Gameplay (argent, contrats, simulation) | ⏳ Phase 2+ |

Les scripts ont été vérifiés syntaxiquement (gdtoolkit `gdparse` + `gdlint`) et le projet
par un validateur statique, mais **Godot n'a pas pu être lancé dans l'environnement de
développement**. La première exécution réelle doit se faire sur votre PC Windows
(voir [docs/SETUP_WINDOWS.md](docs/SETUP_WINDOWS.md)).

## Démarrage rapide (Windows)

```powershell
# 1. Vérifier l'environnement (lecture seule, n'installe rien)
cd DATA_EMPIRE
powershell -ExecutionPolicy Bypass -File .\tools\check_environment.ps1

# 2. Installer Godot si absent
winget install --id GodotEngine.GodotEngine -e

# 3. Lancer les tests (remplacez le chemin par celui de votre Godot *_console.exe)
powershell -ExecutionPolicy Bypass -File .\tools\run_tests.ps1 -Godot "C:\Tools\Godot\Godot_v4.4.1-stable_win64_console.exe"

# 4. Ouvrir le projet : Godot > Importer > sélectionner DATA_EMPIRE\project.godot > F5
```

## Contrôles

| Action | Souris | Clavier | Tactile |
|---|---|---|---|
| Déplacer la vue | clic droit / clic molette + glisser | ZQSD (AZERTY) / WASD (QWERTY) / flèches | 1 doigt |
| Zoom | molette | `+` / `-` | pincer |
| Pivoter de 90° | boutons `<` `>` | A / E (AZERTY) — Q / E (QWERTY) | boutons |
| Recentrer | bouton « Centrer » | Espace / Origine | bouton |

Les touches sont liées à leur **position physique** : le même emplacement fonctionne en AZERTY et QWERTY.

## Structure

```
DATA_EMPIRE/
├── project.godot          configuration (renderer Compatibility, scène principale)
├── scenes/                scènes .tscn (main, world, buildings, equipment, ui)
├── scripts/
│   ├── main/              racine de composition (câblage HUD ↔ monde)
│   ├── world/             monde 3D + caméra isométrique
│   ├── view/              présentation 3D procédurale (aucune règle de jeu)
│   ├── ui/                interface (émet des intentions par signaux)
│   ├── core/              managers globaux (Phase 2+)
│   ├── systems/           règles de simulation pures, testables (Phase 2+)
│   └── entities/          modèles de données (Phase 2+)
├── data/                  données de jeu JSON (Phase 2+)
├── assets/                ressources (vide : tout est procédural pour l'instant)
├── tests/                 tests headless + mini framework
├── tools/                 scripts Windows (vérif. environnement, tests) + validateur Python
└── docs/                  conception, architecture, équilibrage, roadmap, installation
```

## Documentation

- [docs/SETUP_WINDOWS.md](docs/SETUP_WINDOWS.md) — installation et vérification de l'environnement
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — vision, boucle de jeu, ressources, chapitres
- [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md) — couches, conventions, simulation, sauvegarde, risques
- [docs/GAME_BALANCE.md](docs/GAME_BALANCE.md) — premières hypothèses d'équilibrage
- [docs/ROADMAP.md](docs/ROADMAP.md) — phases et critères de validation
- [EXPORT_GUIDE.md](EXPORT_GUIDE.md) — export Web et futur export iOS
- [CHANGELOG.md](CHANGELOG.md)

## Licence des ressources

Aucune ressource externe n'est utilisée. Tous les modèles 3D sont générés par code
(primitives Godot), l'icône est un SVG écrit à la main. Godot est sous licence MIT.
