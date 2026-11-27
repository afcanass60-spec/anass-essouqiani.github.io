# Guide d'export

## 1. Export Web (Phase 7) — réalisable sous Windows, gratuit

### Prérequis
- Godot 4.4+ **édition standard** (l'édition .NET/C# ne s'exporte pas vers le Web).
- Modèles d'export : *Éditeur → Gérer les modèles d'export → Télécharger et installer*
  (gratuit, téléchargé depuis les serveurs officiels Godot).
- Renderer **Compatibility** : déjà configuré dans `project.godot`.

### Choix technique : export *sans threads*
Depuis Godot 4.3, l'export Web peut être **mono-thread** (option *Thread Support*
désactivée). Avantage décisif : il ne nécessite **pas** les en-têtes HTTP
`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`, que GitHub Pages ne
permet pas de configurer. Le jeu pourra donc être hébergé gratuitement sur
GitHub Pages (ce dépôt est déjà un site Pages) ou itch.io.

### Procédure
1. *Projet → Exporter → Ajouter… → Web*.
2. Options : *Thread Support* = désactivé ; *VRAM Texture Compression* : *For Desktop* et *For Mobile* cochés.
3. Filtre d'exclusion des ressources : `tests/*, tools/*, docs/*`.
4. Chemin : `export/web/index.html` (dossier ignoré par Git).
5. Test local : *Exécuter dans le navigateur* (icône en haut à droite de l'éditeur) —
   Godot sert lui-même le jeu en local. Ne pas ouvrir `index.html` par double-clic
   (le navigateur bloque le chargement du `.wasm` en `file://`).
6. Publication (plus tard) : copier `export/web/` vers un dossier du site GitHub Pages
   (ex. `/data-empire/`).

### Points de vigilance Web
- Sauvegarde : `user://` est stocké dans IndexedDB du navigateur (persistant, mais effaçable
  par l'utilisateur). Prévoir export/import manuel de sauvegarde en Phase 5.
- Audio : les navigateurs bloquent le son avant la première interaction — démarrer
  la musique après un clic.
- Taille : objectif < 40 Mo (le moteur Web pèse ~ 30 Mo non compressé, ~ 8 Mo gzip).

## 2. Export iOS (Phase 8) — nécessite un Mac

**L'export iOS final ne peut pas se faire depuis Windows** : Apple impose Xcode, qui
n'existe que sous macOS. Le développement reste entièrement possible sous Windows ;
seule l'étape finale de compilation/signature nécessite un Mac.

### Ce qu'il faudra
| Élément | Coût | Remarque |
|---|---|---|
| Mac (n'importe quel Mac récent compatible avec la dernière version de Xcode) | matériel | emprunt, Mac d'occasion, ou service CI macOS gratuit (GitHub Actions offre des minutes macOS gratuites pour les dépôts publics) |
| Xcode | gratuit | Mac App Store |
| Compte Apple (gratuit) | 0 € | permet d'installer le jeu **sur son propre iPhone** (certificat de 7 jours) |
| Apple Developer Program | 99 $/an | **uniquement** pour TestFlight / App Store — hors budget prototype, à décider plus tard |

### Procédure prévue
1. Sur Windows : *Projet → Exporter → iOS* génère un projet Xcode (`.xcodeproj`)
   — possible depuis Windows, sans signature.
2. Copier le dossier sur le Mac, ouvrir dans Xcode, sélectionner l'équipe (Apple ID),
   brancher l'iPhone, *Run*.
3. Réglages déjà anticipés dans le projet : renderer Compatibility, orientation paysage,
   compression ETC2/ASTC activée, boutons ≥ 56 px, aucun plugin natif, aucune API Web spécifique.

### Reste à faire en Phase 8
- Marges *safe area* (encoche / Dynamic Island) via `DisplayServer.get_display_safe_area()`.
- Profilage sur appareil réel (objectif 60 FPS sur iPhone récent, 30 FPS minimum sur ancien modèle).
- Icônes et écran de lancement aux formats Apple.
