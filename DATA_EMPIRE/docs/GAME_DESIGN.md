# DATA EMPIRE — Document de conception (GDD)

> Version 0.1 — Phase 0. Document vivant, mis à jour à chaque phase.

## 1. Pitch

Vous démarrez dans un garage poussiéreux avec un vieux serveur beige, une box internet
et un ventilateur sur pied. Vous signez vos premiers petits contrats d'hébergement,
installez des racks, gérez l'électricité et la chaleur, survivez aux pannes, puis bâtissez
un réseau mondial de data centers capable d'héberger les workloads IA des géants
(fictifs) de la tech.

## 2. Piliers

1. **L'infrastructure est le gameplay** — CPU, RAM, GPU, stockage, réseau, électricité et
   refroidissement sont des contraintes réelles, pas des chiffres décoratifs.
2. **Chaque contrat est un petit casse-tête** — dimensionner juste : trop faible = pénalités
   SLA, trop puissant = rentabilité détruite.
3. **On voit son empire grandir** — chaque achat apparaît physiquement dans le monde 3D.
4. **Les incidents sont lisibles et justes** — toujours une cause visible, une alerte, une action possible.
5. **Accessible, puis profond** — 5 minutes pour comprendre, des mois pour optimiser.

## 3. Différenciation

| Axe | Ce que DATA EMPIRE fait |
|---|---|
| Choix d'architecture | serveurs généralistes vs GPU vs stockage ; redondance N / N+1 ; densité vs refroidissement |
| SLA | disponibilité simulée par contrat, pénalités proportionnelles, réputation |
| Énergie | budget électrique, prix variable, surcharge = incident |
| Thermique | température par salle, dépendant de la charge réelle |
| Latence & régions | (Chap. 6) choisir où construire selon les clients |
| Appels d'offres | (Chap. 2+) concurrents simulés localement, score multicritère |
| IA | (Chap. 5) workloads GPU très rentables mais énergivores et chauds |

## 4. Boucle de jeu

**Boucle courte (minutes)** : consulter les offres → vérifier la capacité libre → acheter /
installer l'équipement manquant → accepter → encaisser → surveiller température / courant →
réagir aux incidents.

**Boucle moyenne (heures)** : réputation ↑ → contrats plus exigeants → nouvelles technologies
→ agrandissement du bâtiment.

**Boucle longue (jours, idle)** : revenus hors ligne plafonnés, chapitres, nouveaux sites.

## 5. Ressources

| Ressource | Rôle | Source | Consommateur |
|---|---|---|---|
| Argent | tout achat | contrats | achats, maintenance, énergie, pénalités |
| CPU (vCPU) | calcul général | serveurs | contrats |
| RAM (Go) | mémoire | serveurs | contrats |
| GPU (unités) | IA / calcul intensif | serveurs GPU | contrats IA |
| Stockage (To) | données | serveurs stockage, disques | contrats |
| Réseau (Gb/s) | débit | lien internet, switchs | contrats (bande passante) |
| Électricité (kW) | alimentation | tableau / raccordement | tout équipement |
| Refroidissement (kW thermiques) | évacuer la chaleur | ventilateurs, clims, CRAC | chaleur des serveurs |
| Réputation | accès aux contrats | contrats réussis | pénalités, pannes |
| XP / niveau | déblocages | contrats, constructions | — |

## 6. Équipements (MVP)

Serveurs : *Vieux serveur récupéré*, *Serveur entrée de gamme*, *Serveur pro*,
*Serveur haute performance*, *Serveur stockage*, *Serveur GPU* (déblocage tardif MVP).
Infrastructure : *Rack 12U*, *Ventilateur sur pied*, *Climatiseur mobile*,
*Mise à niveau du tableau électrique*, *Box fibre pro*, *Onduleur (UPS)*.
Caractéristiques de chaque serveur : prix, maintenance/min, CPU, RAM, GPU, stockage,
consommation (W), chaleur (W), fiabilité (MTBF simulé), hauteur (U), niveau requis.
Les valeurs vivent dans `data/servers.json` (Phase 2), jamais dans le code.

## 7. Clients & contrats

Entreprises fictives (noms originaux, aucun logo réel) : **Streamora** (streaming),
**Shopverse** (e-commerce), **Nexora AI** (IA), **Cloudora** (cloud), **GameSphere** (jeu en ligne),
**Finovia** (finance), + clients locaux du chapitre 1 (boulangerie en ligne, club de sport,
blog tech, agence web…).

Un contrat = client, durée, revenu/min, besoins (CPU, RAM, GPU, stockage, débit),
SLA cible (95 / 99 / 99,9 / 99,99 %), exigence de sécurité, pénalité par point de SLA
manqué, réputation et XP gagnées. Les SLA sont des **objectifs de simulation**.

## 8. Incidents (MVP)

| Incident | Déclencheur | Signal visuel | Résolution |
|---|---|---|---|
| Panne serveur | fiabilité × température | LED rouge clignotante | réparer (coût) / remplacer |
| Surchauffe | chaleur > refroidissement | LED orange, alerte | ajouter du refroidissement, réduire la charge |
| Coupure électrique | consommation > capacité | tableau rouge, serveurs éteints | réarmer + augmenter la capacité / UPS |

Probabilités bornées et explicables, jamais de malchance pure en série (anti-frustration).

## 9. Chapitres

1. **Garage Computing** — un rack, clients locaux, contraintes de base.
2. **Hosting Company** — premiers contrats pro, appels d'offres simples.
3. **Data Center** — vrai bâtiment, salles, allées chaudes/froides.
4. **Cloud Empire** — capacité mutualisée, clients cloud.
5. **AI Revolution** — GPU, workloads IA, énergie critique.
6. **Global Expansion** — régions, latence.
7. **Digital Dominance** — classements, concurrence globale.

## 10. Hors périmètre du prototype

Multijoueur temps réel, backend, monétisation, publicité. L'architecture prévoit des points
d'extension (classements, défis hebdo, appels d'offres partagés) documentés dans
`TECHNICAL_ARCHITECTURE.md`.
