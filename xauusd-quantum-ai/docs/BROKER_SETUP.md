# Configuration du broker

## 1. Choisir le type de compte (décisif pour 50–300 €)
Voir `ARCHITECTURE.md` §3 : avec un lot minimum de 0,01 (1 once), un compte standard de 50–300 €
ne peut pas respecter 0,25–0,5 % de risque sur l'or ; l'EA refusera presque tous les trades.

Critères, par ordre d'importance :
1. **Compte cent** (ou lot minimum 0,001 sur XAUUSD) — indispensable pour ces montants.
2. **Compte de couverture (hedging)** — en netting, l'EA limite à une position.
3. **Spread XAUUSD** faible et stable (comparez le spread moyen en session Londres/NY, pas le minimum
   publicitaire) ; commission éventuelle connue (à saisir dans `InpCommissionPerLotSide`).
4. Exécution « market » sans requotes, **stop level** faible (`SYMBOL_TRADE_STOPS_LEVEL`).
5. Régulation sérieuse, ségrégation des fonds, protection contre le solde négatif.
6. Historique M1 long et **ticks réels** disponibles dans le testeur.
7. Algo-trading autorisé, VPS autorisé.

## 2. Vérifier les spécifications du symbole
Dans MT5 : clic droit sur XAUUSD → **Spécification**. À noter :

| Champ | Exemple usuel | Impact |
|---|---|---|
| Taille du contrat | 100 (onces/lot) | valeur du point |
| Volume min / pas | 0,01 / 0,01 | faisabilité petit compte |
| Niveau des stops | 0 à 50 points | distance minimale SL/TP |
| Niveau de gel | 0 | modification des stops près du prix |
| Mode de remplissage | FOK / IOC | géré automatiquement |
| Swap | variable | coût de détention (positions ≤ 24 h, fermeture avant week-end) |

L'EA journalise toutes ces valeurs au démarrage et calcule la taille avec `OrderCalcProfit` (gère la
devise du compte, EUR ou USC). Suffixes de symbole (`XAUUSD.r`, `XAUUSDm`…) acceptés ; `GOLD` refusé.

## 3. Fuseau horaire du serveur (`InpServerTZ`)
Méthode : comparez l'heure du *Market Watch* avec l'heure UTC réelle.
* GMT+2 en hiver et GMT+3 en été **US** (mars→novembre) → `EET_US` (cas le plus courant)
* GMT+2/+3 suivant l'été **européen** → `EET_EU`
* Décalage constant → `FIXED` + `InpServerGMTOffset`

En réel, l'EA mesure lui-même le décalage (`InpUseLiveOffset=true`) et l'affiche au démarrage
(`server offset measured …, model …`) : les deux doivent coïncider. Le modèle sert dans le testeur et
pour le calendrier ; utilisez la même valeur dans `python_config.json` (`server_tz_model`).

## 4. Coûts à reporter dans la configuration
| Coût | EA | Python |
|---|---|---|
| Commission par lot et par côté | `InpCommissionPerLotSide` | `commission_per_lot_side` |
| Glissement retenu pour la taille | `InpSlippageAllowancePoints` | `slippage_points` |
| Spread max accepté | `InpMaxSpreadPoints`, `InpMaxSpreadATR` | `max_spread_points`, `max_spread_atr` |

## 5. Tester plusieurs brokers
Exportez l'historique de **chaque** broker (`XQAI_ExportHistory`), lancez `xqai_cli.py backtest` et
`stress` sur chacun : une stratégie qui n'est rentable que chez un broker exploite probablement un
artefact de ses données.
