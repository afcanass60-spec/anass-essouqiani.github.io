"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, ConversationMode, ConversationReport, Correction, PersonaId } from "@/lib/types";
import { MODES, PERSONAS } from "@/lib/personas";
import { ApiError, useActiveTime, useApi, useStore } from "@/lib/store";
import { addXp, ensureCard, recordCorrections, today } from "@/lib/engine/actions";
import { weaknesses } from "@/lib/engine/mastery";
import { XP } from "@/lib/engine/xp";
import { uid } from "@/lib/state";
import { speak, stopSpeaking, useRecognition } from "@/lib/audio";
import { slug } from "@/content/vocab/helpers";
import { formatDate } from "@/lib/format";
import { AiNotice, SpeakButton, useAiUsable } from "@/components/learn/shared";
import { Button, Card, Notice, PageHeader, Pill, Spinner, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

interface ChatResponse {
  reply: string;
  corrections: Correction[];
  betterPhrasing: string;
  expressions: { en: string; fr: string }[];
}

function Corrections({ list, better }: { list: Correction[]; better?: string }) {
  const [open, setOpen] = useState(false);
  if (!list.length && !better) return <p className="mt-1 text-right text-xs text-green">✓ Aucune erreur</p>;
  return (
    <div className="mt-1 text-right">
      <button onClick={() => setOpen(!open)} className="text-xs font-semibold text-amber hover:underline" aria-expanded={open}>
        {list.length ? `${list.length} correction${list.length > 1 ? "s" : ""}` : "Formulation plus naturelle"} {open ? "▲" : "▼"}
      </button>
      {open ? (
        <div className="mt-2 space-y-2 rounded-xl border border-amber/30 bg-amber-soft p-3 text-left text-sm">
          {list.map((c, i) => (
            <div key={i}>
              <span className="text-red line-through" lang="en">{c.original}</span> → <span className="font-semibold text-green" lang="en">{c.corrected}</span>
              <p className="text-muted">{c.explanationFr}</p>
            </div>
          ))}
          {better ? <p><span className="font-semibold">Plus naturel : </span><span lang="en">{better}</span></p> : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ConversationPage() {
  const { state, act, notify } = useStore();
  useActiveTime("conversation");
  const api = useApi();
  const ai = useAiUsable();
  const [persona, setPersona] = useState<PersonaId>("alex");
  const [mode, setMode] = useState<ConversationMode>("free");
  const [convId, setConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOut, setVoiceOut] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const rec = useRecognition(PERSONAS[persona].accent);
  const endRef = useRef<HTMLDivElement>(null);

  const conv = useMemo(() => state?.conversations.find((c) => c.id === convId) ?? null, [state, convId]);
  const p = PERSONAS[conv?.persona ?? persona];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conv?.messages.length, sending]);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    if (rec.listening) setInput(`${rec.transcript} ${rec.interim}`.trim());
  }, [rec.transcript, rec.interim, rec.listening]);

  if (!state) return null;

  function startConversation() {
    const id = uid();
    const now = Date.now();
    act((d) => void d.conversations.push({ id, persona, mode, startedAt: now, updatedAt: now, messages: [{ role: "assistant", content: PERSONAS[persona].intro, ts: now }] }), { silent: true });
    setConvId(id);
    setError(null);
    setShowAnswers(false);
    if (voiceOut) speak(PERSONAS[persona].intro, { lang: PERSONAS[persona].accent, gender: PERSONAS[persona].gender });
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || !conv || sending) return;
    if (rec.listening) await rec.stop();
    setInput("");
    setError(null);
    const userMsg: ChatMessage = { role: "user", content, ts: Date.now() };
    const history = [...conv.messages, userMsg];
    act((d) => {
      const c = d.conversations.find((x) => x.id === conv.id)!;
      c.messages.push(userMsg);
      c.updatedAt = userMsg.ts;
    }, { silent: true });
    setSending(true);
    try {
      const firstUser = history.findIndex((m) => m.role === "user");
      const msgs = history.slice(Math.max(firstUser, history.length - 30)).map((m) => ({ role: m.role, content: m.content }));
      const weak = weaknesses(state!).filter((w) => w.status === "weak").map((w) => w.topic).slice(0, 3);
      const r = await api<ChatResponse>("/api/ai/chat", { persona: conv.persona, mode: conv.mode, level: state!.profile.level, weakTopics: weak, messages: msgs });
      const words = content.split(/\s+/).length;
      act((d, now) => {
        const c = d.conversations.find((x) => x.id === conv.id)!;
        const last = c.messages[c.messages.length - 1];
        if (last?.role === "user") last.corrections = r.corrections;
        c.messages.push({ role: "assistant", content: r.reply, ts: now });
        c.updatedAt = now;
        if (last?.role === "user" && r.betterPhrasing) last.better = r.betterPhrasing;
        recordCorrections(d, r.corrections, "speaking", "conversation", now);
        const day = today(d, now);
        day.conversationMessages += 1;
        if (words >= 5 && day.conversationMessages * XP.conversationMessage <= XP.conversationDailyCap) return addXp(d, XP.conversationMessage, now);
      });
      if (voiceOut) speak(r.reply, { lang: p.accent, gender: p.gender, rate: state!.settings.speechRate });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setSending(false);
    }
  }

  async function endConversation() {
    if (!conv) return;
    setReporting(true);
    setError(null);
    try {
      const firstUser = conv.messages.findIndex((m) => m.role === "user");
      const report = await api<ConversationReport>("/api/ai/report", { persona: conv.persona, mode: conv.mode, level: state!.profile.level, messages: conv.messages.slice(firstUser).slice(-60).map((m) => ({ role: m.role, content: m.content })) });
      act((d, now) => {
        const c = d.conversations.find((x) => x.id === conv.id)!;
        c.report = report;
        c.endedAt = now;
        c.updatedAt = now;
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setReporting(false);
    }
  }

  const userCount = conv?.messages.filter((m) => m.role === "user").length ?? 0;
  const past = [...state.conversations].reverse().filter((c) => c.messages.some((m) => m.role === "user")).slice(0, 8);

  /* ---------- Sélection du personnage ---------- */
  if (!conv) {
    return (
      <div className="space-y-6">
        <PageHeader icon="chat" title="AI Conversation" subtitle="Discutez par écrit ou à la voix avec six personnages. Ils s'adaptent à votre niveau, corrigent vos erreurs, relancent la conversation et vous donnent un bilan détaillé." />
        <AiNotice what="La conversation avec les personnages IA" />
        <section>
          <h2 className="mb-3 font-semibold">1. Choisissez votre interlocuteur</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(PERSONAS).map((x) => (
              <button key={x.id} onClick={() => setPersona(x.id)} aria-pressed={persona === x.id} className={cx("card flex items-start gap-3 p-4 text-left transition", persona === x.id ? "ring-2 ring-primary" : "hover:-translate-y-0.5")}>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `${x.color}33` }} aria-hidden>{x.emoji}</span>
                <span>
                  <span className="block font-display text-lg font-bold">{x.name}</span>
                  <span className="block text-sm text-muted">{x.roleFr} · {x.accent === "en-GB" ? "🇬🇧" : "🇺🇸"}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">2. Choisissez un mode</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(MODES) as ConversationMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={cx("card p-4 text-left transition", mode === m ? "ring-2 ring-violet" : "hover:-translate-y-0.5")}>
                <span className="block font-semibold">{MODES[m].title}</span>
                <span className="block text-sm text-muted">{MODES[m].description}</span>
              </button>
            ))}
          </div>
        </section>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" icon="chat" onClick={startConversation} disabled={!ai.usable}>Commencer avec {PERSONAS[persona].name}</Button>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} className="accent-[var(--primary)]" />Lire les réponses à voix haute</label>
        </div>
        {past.length ? (
          <section>
            <h2 className="mb-3 font-semibold">Conversations récentes</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {past.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setConvId(c.id)} className="card flex w-full items-center gap-3 p-3 text-left">
                    <span className="text-xl" aria-hidden>{PERSONAS[c.persona].emoji}</span>
                    <span className="flex-1">
                      <span className="block font-semibold">{PERSONAS[c.persona].name} · {MODES[c.mode].title}</span>
                      <span className="block text-xs text-muted">{formatDate(c.startedAt)} · {c.messages.filter((m) => m.role === "user").length} message(s)</span>
                    </span>
                    {c.report ? <Pill tone="green">{c.report.score}/100</Pill> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  /* ---------- Conversation ---------- */
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { stopSpeaking(); setConvId(null); }} className="rounded-xl p-2 text-muted hover:bg-surface-2" aria-label="Retour au choix du personnage"><Icon name="arrowLeft" /></button>
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-2xl" style={{ background: `${p.color}33` }} aria-hidden>{p.emoji}</span>
        <div className="flex-1">
          <p className="font-display text-lg font-bold">{p.name}</p>
          <p className="text-xs text-muted">{p.role} · {MODES[conv.mode].title}</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={voiceOut} onChange={(e) => setVoiceOut(e.target.checked)} className="accent-[var(--primary)]" />Voix</label>
        {!conv.report ? (
          <Button size="sm" variant="secondary" icon="trophy" onClick={endConversation} loading={reporting} disabled={userCount < 2 || !ai.usable}>Terminer &amp; bilan</Button>
        ) : null}
      </div>

      <Card className="flex min-h-[50vh] flex-col gap-3 p-4" aria-live="polite">
        {conv.messages.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[85%]", m.role === "user" && "text-right")}>
              <div className={cx("inline-block rounded-2xl px-4 py-2.5 text-left", m.role === "user" ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-surface-2")} lang="en">
                {m.content}
              </div>
              {m.role === "assistant" ? (
                <div className="mt-1"><SpeakButton text={m.content} lang={p.accent} gender={p.gender} size="sm" /></div>
              ) : m.corrections ? (
                <Corrections list={m.corrections} better={m.better} />
              ) : null}
            </div>
          </div>
        ))}
        {sending ? <div className="flex items-center gap-2 text-sm text-muted"><Spinner size={16} />{p.name} écrit…</div> : null}
        <div ref={endRef} />
      </Card>

      {error ? <Notice tone="red" title="Message non envoyé">{error}</Notice> : null}

      {!conv.report ? (
        <div className="space-y-2">
          {userCount === 0 ? (
            <div className="flex flex-wrap gap-2">
              {MODES[conv.mode].starters.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:border-primary hover:text-fg" lang="en">{s}</button>
              ))}
            </div>
          ) : null}
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2">
            <label className="sr-only" htmlFor="chat-input">Votre message en anglais</label>
            <textarea id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2} lang="en" placeholder="Write or speak in English…" className="flex-1 resize-none rounded-2xl border border-line bg-surface p-3 outline-none focus:border-primary" disabled={!ai.usable} />
            {rec.supported ? (
              <Button type="button" variant={rec.listening ? "danger" : "secondary"} onClick={() => (rec.listening ? void rec.stop() : rec.start())} aria-label={rec.listening ? "Arrêter la dictée" : "Parler"} className="h-12 w-12 !px-0" icon={rec.listening ? "stop" : "mic"} />
            ) : null}
            <Button type="submit" className="h-12 w-12 !px-0" icon="send" aria-label="Envoyer" disabled={!input.trim() || sending || !ai.usable} />
          </form>
          {rec.error ? <p className="text-sm text-red">{rec.error}</p> : null}
        </div>
      ) : null}

      {conv.report ? (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Bilan de la conversation</h2>
            <div className="flex gap-2"><Pill tone="green">Progression : {conv.report.score}/100</Pill><Pill tone="violet">Performance : {conv.report.cefr}</Pill></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Notice tone="green" icon="star" title="Points forts">{conv.report.strengths}</Notice>
            <Notice tone="blue" icon="target" title="Conseils">{conv.report.advice}</Notice>
          </div>
          {conv.report.errors.length ? (
            <div>
              <h3 className="mb-2 font-semibold">Erreurs et corrections</h3>
              <ul className="space-y-2">{conv.report.errors.map((c, i) => <li key={i} className="card-flat p-3 text-sm"><span className="text-red line-through" lang="en">{c.original}</span> → <span className="font-semibold text-green" lang="en">{c.corrected}</span><p className="text-muted">{c.explanationFr}</p></li>)}</ul>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Nouveaux mots</h3>
              <ul className="space-y-1.5">
                {conv.report.newWords.map((w) => {
                  const key = `custom:${slug(w.term)}`;
                  const saved = !!state.cards[key];
                  return (
                    <li key={w.term} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                      <span><strong lang="en">{w.term}</strong> — <span className="text-muted">{w.meaning}</span></span>
                      <button disabled={saved} onClick={() => { act((d, now) => void ensureCard(d, key, now, { word: w.term, defEn: w.meaning, fr: w.meaning })); notify("Ajouté à vos révisions"); }} className="shrink-0 text-xs font-semibold text-primary disabled:text-green" aria-label={`Ajouter ${w.term} aux révisions`}>
                        {saved ? "✓" : "+ réviser"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Expressions à retenir</h3>
              <ul className="space-y-1.5">{conv.report.expressions.map((e) => <li key={e.en} className="rounded-lg bg-surface-2 px-3 py-2 text-sm"><strong lang="en">{e.en}</strong> — <span className="text-muted">{e.fr}</span></li>)}</ul>
            </div>
          </div>
          {conv.report.exercise.items.length ? (
            <div className="rounded-2xl border border-line p-4">
              <h3 className="mb-1 font-semibold">Exercice personnalisé</h3>
              <p className="mb-3 text-sm text-muted" lang="en">{conv.report.exercise.instruction}</p>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {conv.report.exercise.items.map((it, i) => (
                  <li key={i}><span lang="en">{it.prompt}</span>{showAnswers ? <span className="ml-2 font-semibold text-green" lang="en">→ {it.answer}</span> : null}</li>
                ))}
              </ol>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowAnswers(!showAnswers)} icon={showAnswers ? "eyeOff" : "eye"}>{showAnswers ? "Masquer" : "Voir"} les réponses</Button>
            </div>
          ) : null}
          <div className="flex justify-end"><Button onClick={() => setConvId(null)} icon="plus">Nouvelle conversation</Button></div>
        </Card>
      ) : null}
    </div>
  );
}
