"""Mise en forme des notifications Telegram (HTML)."""

from __future__ import annotations

import html
from datetime import datetime, timezone

from app.config import CAT_FR, CFG, RESEARCH_NOTES
from app.feeds import indicators, trend_label

E = html.escape


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%d/%m %H:%M UTC")


def _px(x) -> str:
    return f"{x:,.2f}".replace(",", " ") if x is not None else "indisponible"


def context(c, gold, update: bool = False) -> str:
    cats = ", ".join(CAT_FR.get(k, k) for k in c.categories)
    head = "🔁 MISE À JOUR — NOUVELLE MAJEURE" if update else "🌍 ALERTE CONTEXTE"
    lines = [f"<b>{head}</b>  ·  priorité {c.priority if not update else 'HAUTE'}", f"<i>{_now()}</i>", "",
             f"<b>Thème :</b> {E(cats)}", "", "<b>Mouvements Polymarket (5 min) :</b>"]
    seen = set()
    for j in sorted(c.jumps, key=lambda j: -abs(j.p_now - j.p_before))[:6]:
        if j.market.token in seen:
            continue
        seen.add(j.market.token)
        lines.append(f"• {E(j.market.question[:90])}\n   {j.p_before:.0%} → <b>{j.p_now:.0%}</b>"
                     f"  (z={j.z:+.1f}, vol. 24 h {j.market.volume24h / 1000:,.0f} k$)".replace(",", " "))
    ind = indicators(gold.m1(72))
    lines += ["", f"<b>XAUUSD :</b> {_px(gold.mid)} $  ·  marché {'ouvert' if gold.is_open() else 'FERMÉ'}"]
    if ind.get("M15"):
        lines.append(f"Tendance M15 {trend_label(ind, 'M15')} · H1 {trend_label(ind, 'H1')} · "
                     f"ATR M15 {ind['M15']['atr']:.2f} $")
    note = RESEARCH_NOTES.get(c.categories[0])
    if note:
        lines += ["", f"📚 <i>{E(note)}</i>"]
    lines += ["", "➡️ <b>Pas d'ordre à ce stade.</b> Attente de la réaction de l'or "
              f"({CFG.confirm_after_min[0]}-{CFG.confirm_after_min[-1]} min"
              f"{'' if gold.is_open() else ' après la réouverture'}). Volatilité attendue en hausse."]
    return "\n".join(lines)


def signal(c, v: dict, perf: dict) -> str:
    cats = ", ".join(CAT_FR.get(k, k) for k in c.categories)
    main_q = max(c.jumps, key=lambda j: abs(j.p_now - j.p_before)).market.question
    if v["signal"] == "PAS DE TRADE":
        return "\n".join([
            "<b>⏸ PAS DE TRADE</b>", f"<i>{_now()}</i>", "",
            f"<b>Événement :</b> {E(cats)} — {E(main_q[:90])}",
            f"<b>XAUUSD :</b> {_px(v.get('px'))} $", "",
            f"<b>Raison :</b> {E(v['raison'])}", "",
            "Conditions non réunies : aucune position n'est proposée."])
    emoji = "🟢" if v["signal"] == "BUY" else "🔴"
    ind = v["ind"]
    rr = abs(v["tp"] - v["entry"]) / v["risk"] if v["risk"] else 0
    if perf.get("n", 0) >= 30:
        conf = (f"{perf['taux_gain']:.0%} de réussite mesurée sur {perf['n']} signaux papier "
                f"(R moyen {perf['r_moyen']:+.2f})")
    else:
        conf = (f"NON CALIBRÉE — expérimental ({perf.get('n', 0)}/30 signaux papier clôturés). "
                "La recherche n'a pas démontré d'avantage statistique : à traiter comme une idée, pas une certitude.")
    lines = [
        f"<b>🚨 ALERTE TRADING INTELLIGENCE</b>", f"<i>{_now()}</i>", "",
        "<b>ACTIF :</b> XAUUSD", f"<b>DIRECTION :</b> {emoji} <b>{v['signal']}</b>", "",
        f"<b>PRIX ACTUEL :</b> {_px(v['px'])} $ (Swissquote)", "",
        f"<b>ÉVÉNEMENT :</b> {E(cats)}", f"{E(main_q[:120])}",
        "<b>SOURCE :</b> Polymarket (probabilités en direct)", "",
        "<b>ANOMALIE :</b>",
    ]
    for j in sorted(c.jumps, key=lambda j: -abs(j.p_now - j.p_before))[:3]:
        lines.append(f"• {j.p_before:.0%} → {j.p_now:.0%} en 5 min (z={j.z:+.1f})")
    lines += [
        "", "<b>CONFIRMATION TECHNIQUE :</b>",
        f"• L'or a bougé de {v['move']:+.2f} $ depuis le saut (≥ {CFG.confirm_atr_frac} ATR M15 = {v['atr']:.2f} $)",
        f"• Tendance M15 {v['trend']} · H1 {trend_label(ind, 'H1')} · RSI M15 {ind['M15']['rsi']:.0f}",
    ]
    if v.get("contre_intuition"):
        lines.append("• ⚠️ Réaction opposée au sens « intuitif » de la nouvelle : c'est le marché qui décide "
                     "(cf. inversion du lien en 2026).")
    note = RESEARCH_NOTES.get(c.categories[0])
    if note:
        lines.append(f"• 📚 {E(note)}")
    lines += [
        "", "<b>SCÉNARIO (indicatif, paper trading) :</b>",
        f"• Entrée : {_px(v['entry'])}", f"• Stop-loss : {_px(v['sl'])}", f"• Take-profit : {_px(v['tp'])}",
        f"• R:R : 1:{rr:.1f}", "",
        f"<b>HORIZON :</b> 1 à {CFG.trade_timeout_h:.0f} heures", "",
        f"<b>CONFIANCE :</b> {conf}", "",
        "<b>INVALIDATION :</b>",
        f"• Retour de l'or sous/au-dessus de {_px(c.gold_ref)} (prix au moment du saut)",
        "• Démenti ou inversion rapide des probabilités Polymarket",
        "• Annonce macro US imprévue (CPI, NFP, Fed) dans l'horizon",
    ]
    return "\n".join(lines)


def closed(t, outcome: str, exit_px: float, r: float) -> str:
    icon = {"OBJECTIF": "✅", "STOP": "❌", "EXPIRÉ": "⌛"}.get(outcome, "•")
    return (f"{icon} <b>Clôture papier #{t['id']}</b> — {t['direction']} XAUUSD\n"
            f"Entrée {_px(t['entry'])} → sortie {_px(exit_px)} ({outcome}) · <b>{r:+.2f} R</b>")
