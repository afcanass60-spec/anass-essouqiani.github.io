# Équilibrage — hypothèses initiales

> Valeurs **provisoires** de travail pour la Phase 2. Elles seront déplacées dans
> `data/*.json` et ajustées par simulation et playtests. Unité monétaire : crédits (¢).

## Objectifs de rythme

| Jalon | Temps de jeu actif visé |
|---|---|
| Premier contrat signé | < 2 min |
| Premier achat de serveur | < 5 min |
| Rack 12U plein | 45–60 min |
| Fin du chapitre 1 | 2–3 h (idle inclus) |

## Départ

- Argent initial : 2 500 ¢ · niveau 1 · réputation 10/100.
- Équipement : rack 12U, vieux serveur (4 vCPU, 8 Go, 500 Go), ventilateur, tableau 3 kW, box 100 Mb/s.

## Serveurs (brouillon)

| Serveur | Prix | Maint./min | vCPU | RAM | GPU | Stock. | Conso | U | Fiabilité | Niv. |
|---|---|---|---|---|---|---|---|---|---|---|
| Vieux serveur récupéré | — | 1 | 4 | 8 Go | 0 | 0,5 To | 350 W | 2 | faible | 1 |
| Entrée de gamme | 1 200 | 2 | 8 | 16 Go | 0 | 1 To | 250 W | 1 | moyenne | 1 |
| Pro | 3 500 | 4 | 16 | 64 Go | 0 | 2 To | 400 W | 2 | bonne | 3 |
| Stockage | 4 000 | 4 | 4 | 32 Go | 0 | 24 To | 450 W | 2 | bonne | 4 |
| Haute performance | 9 000 | 8 | 48 | 256 Go | 0 | 4 To | 800 W | 2 | très bonne | 6 |
| GPU | 18 000 | 15 | 16 | 128 Go | 4 | 2 To | 1 800 W | 4 | bonne | 8 |

Règle : chaleur produite (W) ≈ consommation × taux d'utilisation (+ base au repos 40 %).

## Contrats (brouillon de formule)

`revenu/min ≈ Σ(ressource demandée × prix unitaire) × multiplicateur SLA × multiplicateur client`

Multiplicateurs SLA : 95 % ×1,0 · 99 % ×1,3 · 99,9 % ×1,7 · 99,99 % ×2,4.
Pénalité : par tranche de 0,1 point sous la cible, 10 % du revenu de la période.

## Énergie & thermique

- Prix de l'énergie : 0,02 ¢ / W / min (événement « hausse » : ×1,5 pendant 10 min).
- Ventilateur : évacue 1,2 kW · Climatiseur mobile : 3,5 kW.
- Température : rapprochement exponentiel vers `ambiante + (chaleur − refroidissement) × k`.
- Seuils : > 35 °C performances −20 % · > 40 °C risque de panne ×3.

## Garde-fous

- Hors ligne plafonné à 8 h, revenus hors ligne ×0,5 (incite à revenir sans punir).
- Une panne ne peut pas se reproduire sur le même serveur moins de 5 min après réparation.
- Toujours au moins un contrat accessible avec l'infrastructure actuelle (anti-blocage).
