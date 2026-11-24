"""Direction fondamentale a priori de chaque marché pour l'or.

prior = +1 : si la probabilité du OUI augmente, le mécanisme attendu est HAUSSIER pour l'or.
prior = -1 : si la probabilité du OUI augmente, le mécanisme attendu est BAISSIER pour l'or.
prior =  0 : mécanisme ambigu ou sans lien -> exclu des tests directionnels.

Règles écrites à partir du seul texte des questions, AVANT tout calcul de résultat,
pour éviter le biais d'ajustement aux données. Première règle qui correspond = gagnante.
Mécanismes retenus : escalade géopolitique -> refuge (+), désescalade (-),
assouplissement monétaire / pression sur l'indépendance de la Fed (+),
resserrement / taux longs en hausse (-), droits de douane imposés (+), levés (-),
shutdown prolongé (+), fin de shutdown (-).
"""

from __future__ import annotations

import re

RULES: list[tuple[str, int, str]] = [
    # --- Exclusions : sans lien, circulaire ou ambigu ---
    (r"powell say|trump say|handshake|\bkiss\b|fart|egg prices|silver|mugshot|fact check|nobel"
     r"|speaker of the house|election|tiktok|deepseek|ai model|board of peace|mayor|leader of"
     r"|head of state|prime minister|parliament|seats|meet next|confirmed as fed chair|nominat"
     r"|as next fed chair|refrain from announcing|odds|revenue|tariff dividend|tariffs generate"
     r"|lai ching|seen in public|prison|released from custody|cilia|machado|grenell|endorses"
     r"|tariff rate on china be|recapture|ukraine aid|enriched uranium|china.s 2026 annual gdp"
     r"|argentina|\becb\b|pause.(pause|cut)|cuts happen|upper bound|regime fall|leadership change"
     r"|khamenei out|putin out|netanyahu out|zelenskyy out|d.az-canel|maduro out|maduro in u\.s"
     r"|shutdown end (?!by)|end (october|november) \d|supreme court", 0, "exclu/ambigu"),
    # --- Négations explicites ---
    (r"\bno fed rate cuts\b", -1, "pas de baisse Fed"),
    (r"will no us x venezuela military engagement", -1, "pas d'engagement militaire"),
    (r"\bnot meet\b", 0, "ambigu"),
    (r"no change in fed", 0, "statu quo Fed (dépend des anticipations)"),
    # --- Politique monétaire US ---
    (r"fed.*(decrease|cut)|(decrease|cut).*fed|rate cut by|lower bound reach", +1, "assouplissement Fed"),
    (r"fed.*(increase|hike)|(increase|hike).*fed|rate hike", -1, "resserrement Fed"),
    (r"powell out|fire powell|lisa cook out", +1, "pression sur l'indépendance de la Fed"),
    (r"end qt", +1, "fin du QT"),
    (r"10-year treasury yield hit", -1, "taux longs en hausse"),
    (r"recession", +1, "récession"),
    # --- Shutdown ---
    (r"shutdown end by|pass funding bill", -1, "fin du shutdown"),
    (r"shut down for|shutdown last|government shutdown|funding lapse|shutdown on", +1, "shutdown"),
    # --- Désescalade (avant l'escalade : « ceasefire » prime sur « strike ») ---
    (r"ceasefire|peace deal|conflict ends|action against iran ends|end of military operations"
     r"|blockade.*lifted|end of iranian blockade|returns to normal|agreement|trade deal"
     r"|lower tariffs|reduce tariffs|tariff reduction|diplomatic meeting|mineral deal"
     r"|ends ukraine war|meet with putin|putin meet with trump|meet with xi|visit china"
     r"|visit us|talk to nicol|agree to iranian|agree to unfreeze|meet with (kim|yoon|vladimir)", -1, "désescalade"),
    # --- Escalade ---
    (r"military clash|military engagement|invade|blockade|strike|military action|forces enter|forces in"
     r"|closes its airspace|nuclear weapon|war powers|declare war|capture (kupiansk|pokrovsk)"
     r"|kharg island no longer|seize|ground operation|withdraw from nato|sanctions"
     r"|crude oil.*\(high\)", +1, "escalade / choc d'offre"),
    (r"impose|increase tariffs|100% tariff|tariff of|tariffs on", +1, "droits de douane"),
]

_COMPILED = [(re.compile(p, re.I), d, why) for p, d, why in RULES]


def prior_direction(question: str) -> tuple[int, str]:
    for rx, d, why in _COMPILED:
        if rx.search(question or ""):
            return d, why
    return 0, "non classé"
