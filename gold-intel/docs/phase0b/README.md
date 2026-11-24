# Phase 0b — Positionnements inhabituels avant les révélations

*Rapport de recherche — 24 novembre 2026. Données réelles : Polymarket Data API v2 (trades publics avec adresse de portefeuille) et historique d'activité des portefeuilles. Vocabulaire : on parle d'anomalie statistique, jamais de délit d'initié. Aucune adresse n'est publiée.*

## Verdict

> **Pas de signal systématique exploitable.** Avant les 36 révélations surprises étudiées, la part des paris « long shot » sur l'issue gagnante **n'augmente pas** une fois rapportée au volume total ; elle a même tendance à baisser. Les portefeuilles récents ne sont pas plus présents avant les révélations (10,8 %) que le reste du temps (13,5 %).
>
> Une **exception** ressort : l'opération américaine au Venezuela (3 janvier 2026). La part des gros paris sur l'issue gagnante y est multipliée par 6 à 9 dans les 72 heures précédentes. C'est réel mais **isolé** : 1 cas sur 36 ne fait pas un signal de trading.

## Méthode (fixée avant les résultats)

- **Révélation surprise** : issue à 30 % ou moins 24 h avant, puis 90 % ou plus, résolution finale confirmée. T* = premier passage à 90 %. On obtient **51 marchés et 36 cas** entre mars 2025 et juillet 2026, dont Maduro (janvier 2026), les frappes sur l'Iran et le départ de Khamenei (28 février 2026), le cessez-le-feu États-Unis/Iran (7 avril 2026) et le cessez-le-feu Russie/Ukraine (mai 2026).
- **Pari suspect** : position sur l'issue gagnante (achat de celle-ci ou vente de l'opposée) à un prix de 0,35 ou moins, pour au moins 2 000 $. On en trouve 1 622.
- **Portefeuille neuf** : première activité Polymarket moins de 7 jours avant le trade.
- **Fenêtres** : référence [T* − 30 j ; T* − 72 h) contre 72 h, 24 h et 6 h avant T*.

## Résultats

### 1. Flux brut : trompeur

Sur les grands cas, le flux suspect en dollars par jour explose avant T* : de 85 k$ à 1,1 M$ par jour pour « US strikes Iran », de 41 k$ à 1,3 M$ pour le cessez-le-feu d'avril. Mais **tout le volume** explose en même temps, porté par des tensions publiques (déploiements, déclarations, rumeurs de presse). Sur l'ensemble des cas : 11 hausses, 3 baisses, Wilcoxon p = 0,15.

### 2. Rapporté au volume : rien

Part des paris suspects dans le volume de la fenêtre (22 marchés avec activité) :

| Fenêtre | Hausse | Baisse | p (Wilcoxon, unilatéral) |
|---|---|---|---|
| 72 h avant T* | 8 | 14 | 0,89 |
| 24 h avant T* | 7 | 15 | 0,94 |
| 6 h avant T* | 5 | 17 | 0,996 |

Exemples : « US strikes Iran » passe de 13,7 % en référence à 5,4 % dans les 6 dernières heures ; « Khamenei out (mars) » de 11,8 % à 0 %.

### 3. L'exception Venezuela (3 janvier 2026)

| Marché | Référence | 72 h | 24 h | 6 h |
|---|---|---|---|---|
| US x Venezuela military engagement by Jan 15 | 0,7 % | 4,5 % | 6,8 % | 6,2 % |
| Maduro out by February 28 | 0 % | 5,7 % | 6,4 % | 6,7 % |
| Maduro out by March 31 | 2,4 % | 5,2 % | 5,9 % | 6,4 % |

Première alerte « portefeuille neuf » environ **30 h avant** T*. Mais l'or était **fermé** (samedi), et il a peu bougé à la réouverture. Même un signal parfait n'aurait rien rapporté sur XAUUSD dans ce cas.

### 4. Règle d'alerte testée

Règle : au moins un pari suspect d'un portefeuille neuf sur un marché, regroupé par tranches de 6 h.

| | |
|---|---|
| Alertes distinctes (sur ces 51 marchés, environ 30 jours chacun) | 108 |
| dont révélation dans les 72 h | 34 (31 %) |
| dont révélation dans les 24 h | 20 (19 %) |
| Cas couverts par au moins une alerte | 6 sur 36 |
| Délai médian avant T* | 40 h |

Ces 31 % sont **surestimés** : tous ces marchés ont connu une surprise, par construction. Sur l'ensemble des centaines de marchés surveillés en continu, la grande majorité des alertes ne serait suivie d'aucune révélation.

### 5. Impact sur l'or à la révélation

Les révélations géopolitiques majeures tombent souvent **le week-end, or fermé** : Venezuela le samedi 3 janvier, frappes sur l'Iran le samedi 28 février. Quand l'or est ouvert, l'effet peut être fort (cessez-le-feu du 7 avril : +2,2 % entre T* − 1 h et T* + 4 h), mais son **sens dépend du régime** (voir le rapport de la Phase 0).

## Limites

- 36 cas seulement, dont la plupart sur de petits marchés sans aucun gros pari.
- On ne voit que **les trades publics de Polymarket**. Un acteur informé peut passer par plusieurs portefeuilles anciens, par Kalshi, ou ne pas parier du tout.
- Les horodatages de « révélation » viennent des prix Polymarket eux-mêmes, pas de dépêches horodatées. Une partie de la montée avant T* peut donc refléter de l'information **publique** déjà diffusée.
- Les seuils (0,35 ; 2 000 $ ; 7 jours) ont été fixés a priori et non optimisés. D'autres seuils pourraient trouver d'autres cas, avec un risque élevé de surapprentissage.

## Conséquence

Les Phases 0 et 0b convergent : **Polymarket n'apporte pas d'avance directionnelle fiable sur l'or.** Son utilité réelle est la suivante :
1. **Capteur de contexte** : quels risques le marché anticipe, et avec quelle probabilité.
2. **Alerte de risque et de volatilité** : une nouvelle majeure est en cours.
3. **Surveillance des comportements inhabituels**, en alerte d'information basse priorité seulement, jamais en signal de trade.

Le moteur de décision doit reposer sur **le prix de l'or lui-même** (structure, volatilité, réaction aux annonces) et sur son **contexte macro** (DXY, taux réels, calendrier), avec Polymarket comme variable d'appoint.

## Reproduire

```bash
python -m research.fetch_surprise_trades   # trades des 51 marchés (≈ 15 min)
python -m research.phase0b_wallets
```
