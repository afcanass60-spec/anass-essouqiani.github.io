# Passer en compte réel

Le passage en réel est **votre** décision. Le bot peut trader sans intervention une fois activé, mais
rien dans ce projet ne garantit un gain ; vous pouvez perdre tout ou partie du capital déposé.

## Prérequis (tous obligatoires)
- [ ] `BACKTESTING.md` §4 : critères atteints **hors échantillon**, sur ≥ 2 brokers ou ≥ 2 jeux de données.
- [ ] Parité EA ↔ Python vérifiée.
- [ ] **Démo forward ≥ 2–3 mois et ≥ 50 trades** avec le **même** broker, preset et VPS que le réel ;
      résultats compatibles avec l'intervalle Monte Carlo du backtest (pas seulement « positifs »).
- [ ] Aucune erreur d'exécution non comprise dans les journaux de démo (requotes, stops refusés…).
- [ ] Compte réel adapté au capital (compte cent pour 50–300 €) ; diagnostic petit compte au
      démarrage **sans** avertissement « ACCOUNT TOO SMALL ».
- [ ] Vous savez arrêter le bot en 10 secondes (bouton STOP, fichier STOP, retrait de l'EA).
- [ ] Capital engagé = argent dont la perte totale ne vous mettrait pas en difficulté.

## Activation
1. Chargez `XauQuantumAI_live_conservative.set` (risque 0,25 %, 1 position, 3 trades/jour).
2. Renseignez :
   * `InpMode = LIVE`
   * `InpLiveConfirmation = I ACCEPT THE RISK OF REAL TRADING` (texte exact)
   * `InpLiveAccount = <numéro de votre compte réel>`
3. Au démarrage, l'EA refuse de trader si : le symbole n'est pas XAUUSD, le compte ne correspond pas,
   la phrase est absente, les spécifications du contrat sont invalides, le trading est désactivé,
   ou un HALT est en cours. Il journalise compte, levier, devise, contrat et diagnostic de risque.

## Montée en charge
| Phase | Durée | Risque/trade |
|---|---|---|
| 1 | 1 mois | 0,25 % |
| 2 | si conforme aux attentes | 0,35 % |
| 3 | si conforme | 0,5 % (maximum du projet) |

Ne jamais augmenter le risque après une série de pertes. Les limites journalières (2 %) et le HALT à
5 % de drawdown restent actifs ; après un HALT, analysez les journaux **avant** de relancer avec
`InpResetHalt=true` (le pic d'equity de référence est alors réinitialisé).

## Critères d'arrêt (à décider à l'avance)
* Drawdown réel > 1,5× le drawdown médian Monte Carlo → arrêt et réanalyse.
* Écart durable entre réel et démo/backtest (slippage, spreads, fréquence de trades).
* Changement de broker, de type de compte ou de conditions de marché majeur → retour en démo.
* Toute anomalie inexpliquée dans les journaux.

## Suivi
Journal hebdomadaire : trades, R moyen, slippage moyen, refus par raison (`journal_decisions.csv`),
comparaison avec le backtest. Ré-entraînement / ré-optimisation : seulement selon le protocole
walk-forward (par ex. trimestriel), jamais à chaud après une perte.
