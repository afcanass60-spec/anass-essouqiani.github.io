# Mettre le site en ligne (Render, formule gratuite)

Le dépôt contient un fichier `render.yaml` (à la racine) qui décrit tout : un service web (frontend + API dans un seul conteneur, `job-hunter-ai/Dockerfile.render`) et une base PostgreSQL. Les clés de sécurité sont générées automatiquement.

## Étapes (≈ 10 minutes, dont ≈ 8 de construction automatique)
1. Créez un compte sur https://render.com avec **« Sign in with GitHub »**.
2. Tableau de bord Render → **New +** → **Blueprint**.
3. Autorisez Render à accéder au dépôt `anass-essouqiani.github.io`, puis sélectionnez-le.
4. **Branche** : choisissez celle qui contient `job-hunter-ai` (tant que la pull request n'est pas fusionnée : `claude/dazzling-hypatia-1awl1u` ; ensuite `main`).
5. Render affiche les ressources (`job-hunter-ai` + `job-hunter-db`) et les clés facultatives (Anthropic, France Travail…) : laissez vides celles que vous n'avez pas encore → **Apply**.
6. À la fin, ouvrez le service `job-hunter-ai` : l'adresse est en haut (ex. `https://job-hunter-ai-xxxx.onrender.com`). Créez votre compte — **faites-le tout de suite** : le premier compte créé est administrateur et les inscriptions se ferment ensuite.

Ajouter une clé plus tard : service `job-hunter-ai` → **Environment** → modifier → **Save changes** (redéploiement automatique).

## Limites de la formule gratuite
- **Mise en veille** après 15 min sans visite : la première ouverture suivante prend ~1 minute.
- **Pas de recherche automatique** (le planificateur ne peut pas tourner sur un service qui se met en veille) : utilisez « Lancer maintenant ». L'interface l'indique.
- **Base gratuite limitée à 30 jours** chez Render : ensuite, passez la base en offre payante (~6 $/mois) ou exportez vos données avant l'expiration.
- Les PDF/DOCX des dossiers sont régénérés à l'identique depuis la base si le disque a été remis à zéro.

## Pour un usage quotidien (recherche automatique)
Passez le service en offre **Starter** (~7 $/mois, pas de mise en veille), la base en **Basic** (~6 $/mois), créez un **Key Value** (Redis, gratuit) puis ajoutez au service : `REDIS_URL` = adresse interne du Key Value et `RUN_WORKER=true`. Le tableau de bord affichera « Planificateur actif ».
