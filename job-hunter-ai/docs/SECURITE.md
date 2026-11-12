# Sécurité et fiabilité

## Authentification et permissions
- Mots de passe hachés Argon2id ; politique : 10 caractères, 3 classes.
- Session : JWT signé (HS256) dans un cookie `httpOnly`, `SameSite=Strict`, `Secure` en production ; jamais accessible au JavaScript.
- Verrouillage 15 min après 5 échecs ; audit des connexions.
- Premier compte = administrateur ; inscriptions fermées ensuite (`ALLOW_REGISTRATION`).
- **Isolation** : chaque requête filtre par `user_id` ; un objet d'un autre utilisateur renvoie 404 (testé).
- Contrôle d'origine sur les requêtes mutantes (défense en profondeur CSRF).

## Secrets
- Clés d'API uniquement dans `.env` côté serveur (jamais envoyées au navigateur ; la page Paramètres n'affiche que « configuré / non configuré »).
- Secrets propres à l'utilisateur (URL de webhook) chiffrés en base (Fernet, `ENCRYPTION_KEY`).
- Démarrage refusé en production sans `SECRET_KEY`/`ENCRYPTION_KEY` robustes.

## Entrées et URLs
- Validation Pydantic (types, longueurs, énumérations) sur toutes les routes ; taille max des imports (8 Mo, 10 pages).
- URLs affichées : http(s) uniquement (pas de `javascript:`), liens externes en `noopener noreferrer nofollow`.
- Récupération de pages (`safe_get`) : schémas http(s), ports standards, résolution DNS et refus des IP privées/loopback/link-local (anti-SSRF) à chaque redirection, respect de robots.txt, taille max 3 Mo, liste de domaines interdits à la collecte.
- Téléchargements : chemins vérifiés sous le dossier de l'utilisateur.
- Aperçu de CV rendu dans un `iframe` sandboxé sans script, contenu échappé par Jinja2.

## Injection de prompt (annonces = données non fiables)
1. Détection de motifs d'injection (FR/EN) → drapeau visible sur l'offre.
2. Neutralisation : chevrons remplacés, caractères invisibles supprimés, troncature, balisage `<untrusted_document>` + consigne système explicite.
3. Le modèle n'a **aucun outil** et ne produit que du JSON contraint par schéma, revalidé côté serveur.
4. Garde-fous métier : écart de score borné, compétences revendiquées recoupées avec le profil, puces de CV citant une compétence absente rejetées, analyse de lettre signalant les compétences non justifiées.
5. Aucune action externe (envoi d'email) ne dépend de l'IA : envoi seulement après validation du dossier **et** confirmation explicite.

## Données personnelles (RGPD)
- Auto-hébergé : vos données restent sur votre serveur ; seuls les textes nécessaires sont envoyés à l'API Claude lorsque l'IA est activée (profil + annonce).
- Les emails d'alerte sont lus en lecture seule et seuls les liens d'annonces sont conservés.
- Suppression : supprimer une offre/candidature/CV supprime ses dépendances (cascade) ; supprimer le compte (base) supprime toutes ses données.

## Robustesse
- Une source en erreur n'interrompt pas les autres ; erreurs consignées dans le rapport.
- Retries Celery (2) sur les recherches planifiées ; retries SDK (3) et gestion typée des erreurs de l'API IA (clé invalide, quota, indisponibilité, refus, réponse tronquée) avec repli déterministe.
- Verrou anti-doublon des exécutions planifiées.
