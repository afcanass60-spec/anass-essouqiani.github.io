# Exécution 24 h/24 sur un VPS

## 1. Choix du VPS
* Windows Server (MT5 est une application Windows), 2 vCPU, 4 Go RAM suffisent.
* Datacenter proche du serveur du broker (latence < 10–20 ms ; Londres LD4 / New York NY4 selon le broker).
* Alternative : **VPS MetaQuotes intégré** (clic droit sur le compte → *Enregistrer un serveur virtuel*) :
  très simple, mais **sans Python** → utilisez alors `InpAIMode = OFF` ou `NATIVE`, et les journaux
  restent sur le VPS MetaQuotes (le dashboard web n'y a pas accès).

## 2. Installation
1. Installez MT5 depuis le site de votre broker, connectez le compte, **cochez « Enregistrer le mot de passe »**.
2. Copiez et compilez l'EA (`INSTALL_MT5.md`).
3. Options → Expert Advisors : *Autoriser le trading algorithmique* ; décochez *Désactiver le trading
   algorithmique lors du changement de compte/profil* si vous ne changez jamais de compte.
4. Ouvrez XAUUSD, attachez l'EA avec le preset, enregistrez le **profil** (Fichier → Profils) : il
   sera rechargé au redémarrage.

## 3. Redémarrage automatique
* Raccourci de `terminal64.exe` dans `shell:startup` (session utilisateur avec ouverture automatique
  via `netplwiz`), ou tâche planifiée « À l'ouverture de session ».
* Désactivez les redémarrages Windows Update en semaine (heures actives) et planifiez-les le week-end.
* L'état de risque (pic d'equity, HALT, série de pertes, trades du jour) est **persisté** dans les
  variables globales du terminal : un redémarrage ne remet pas les compteurs à zéro.
* Après un redémarrage, l'EA ré-adopte ses positions ouvertes (même magic) et continue de les gérer.

## 4. Service Python (optionnel)
```powershell
# Python 3.11+ installé, dans le dossier du projet
cd xauusd-quantum-ai\python
python -m venv .venv ; .venv\Scripts\activate
pip install -r requirements.txt
python -m xqai.bridge.server --model ..\models\hgb.joblib     # ou xqai_model.txt
```
* Le service écrit `heartbeat.txt` toutes les 2 s ; l'EA le considère vivant si < 15 s.
* Lancez-le au démarrage avec le Planificateur de tâches (« Au démarrage », « Redémarrer en cas d'échec »)
  ou NSSM pour en faire un service Windows.
* S'il tombe : l'EA passe en **mode dégradé** (modèle natif si `BRIDGE_FALLBACK`, sinon aucun trade).

## 5. Dashboard web
```powershell
python dashboard\server.py --token "un-secret-long"
```
Écoute sur `127.0.0.1:8050` uniquement. Pour le consulter depuis chez vous, utilisez un **tunnel SSH**
(`ssh -L 8050:127.0.0.1:8050 user@vps`) ou ouvrez-le dans la session RDP. **Ne l'exposez pas sur
Internet** : il permet de déclencher l'arrêt d'urgence.

## 6. Surveillance
* Activez les notifications push MT5 (Options → Notifications, ID MetaQuotes) : les erreurs critiques
  apparaissent dans le journal ; un HALT est visible sur le panneau.
* Vérifiez chaque jour : `log_YYYYMMDD.txt`, `journal_trades.csv`, cohérence balance broker / dashboard.
* Pendant les jours fériés US/UK (liquidité faible), envisagez une PAUSE manuelle.
