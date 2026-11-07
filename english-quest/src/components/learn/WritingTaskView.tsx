"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { WritingFeedback, WritingTask } from "@/lib/types";
import { ApiError, useApi, useStore } from "@/lib/store";
import { addXp, logError, today } from "@/lib/engine/actions";
import { wordCount } from "@/lib/engine/answer";
import { XP } from "@/lib/engine/xp";
import { uid } from "@/lib/state";
import { useAiUsable, AiNotice } from "./shared";
import { Button, Card, LevelPill, Notice, Pill, Tabs, cx } from "@/components/ui/primitives";

const GENRE_FR: Record<string, string> = { email: "Email", "formal-letter": "Lettre formelle", "informal-letter": "Lettre informelle", minutes: "Compte rendu", essay: "Essai argumentatif", article: "Article", summary: "Résumé", report: "Rapport", proposal: "Proposition", academic: "Texte académique" };
const CAT_FR: Record<string, string> = { grammar: "Grammaire", spelling: "Orthographe", punctuation: "Ponctuation", vocabulary: "Vocabulaire", structure: "Structure", coherence: "Cohérence", fluency: "Fluidité", register: "Registre" };
const CAT_COLOR: Record<string, string> = { grammar: "var(--red)", spelling: "var(--amber)", punctuation: "var(--amber)", vocabulary: "var(--violet)", structure: "var(--primary)", coherence: "var(--primary)", fluency: "var(--green)", register: "var(--green)" };

/** Texte original avec les fragments fautifs surlignés et numérotés. */
export function Annotated({ text, issues }: { text: string; issues: WritingFeedback["issues"] }) {
  const parts = useMemo(() => {
    const ranges: { start: number; end: number; n: number; cat: string }[] = [];
    issues.forEach((iss, n) => {
      if (!iss.original) return;
      let idx = text.indexOf(iss.original);
      if (idx < 0) idx = text.toLowerCase().indexOf(iss.original.toLowerCase());
      if (idx < 0) return;
      const end = idx + iss.original.length;
      if (ranges.some((r) => idx < r.end && end > r.start)) return;
      ranges.push({ start: idx, end, n: n + 1, cat: iss.category });
    });
    ranges.sort((a, b) => a.start - b.start);
    const out: ReactNode[] = [];
    let pos = 0;
    ranges.forEach((r, k) => {
      if (r.start > pos) out.push(<span key={`t${k}`}>{text.slice(pos, r.start)}</span>);
      out.push(
        <mark key={`m${k}`} className="rounded px-0.5 text-fg" style={{ background: "color-mix(in srgb, " + (CAT_COLOR[r.cat] ?? "var(--red)") + " 25%, transparent)", borderBottom: `2px solid ${CAT_COLOR[r.cat] ?? "var(--red)"}` }}>
          {text.slice(r.start, r.end)}
          <sup className="ml-0.5 text-[0.65rem] font-bold">{r.n}</sup>
        </mark>,
      );
      pos = r.end;
    });
    out.push(<span key="end">{text.slice(pos)}</span>);
    return out;
  }, [text, issues]);
  return <p className="whitespace-pre-wrap leading-relaxed" lang="en">{parts}</p>;
}

export interface WritingOutcome {
  rating?: number;
  evaluated: boolean;
}

export function WritingTaskView({ task, onComplete, examMode }: { task: WritingTask; onComplete?: (o: WritingOutcome) => void; examMode?: boolean }) {
  const { act } = useStore();
  const api = useApi();
  const ai = useAiUsable();
  const draftKey = `eq:draft:${task.id}`;
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"original" | "corrected" | "improved">("original");

  useEffect(() => {
    if (examMode) return;
    try {
      const d = localStorage.getItem(draftKey);
      if (d) setText(d);
    } catch {
      /* brouillon indisponible */
    }
  }, [draftKey, examMode]);
  useEffect(() => {
    if (examMode || submitted) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, text);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [text, draftKey, examMode, submitted]);

  const words = wordCount(text);
  const inRange = words >= task.minWords && words <= task.maxWords;

  function save(fb?: WritingFeedback) {
    act((d, now) => {
      d.writing.push({ id: uid(), taskId: task.id, level: task.level, ts: now, text, wordCount: words, feedback: fb });
      today(d, now).writingDone += 1;
      if (fb) {
        for (const iss of fb.issues) {
          logError(d, { skill: "writing", topic: fb.topics?.[0] && iss.category === "grammar" ? fb.topics[0] : iss.category === "vocabulary" ? "vocabulary" : undefined, original: iss.original, corrected: iss.correction, explanation: iss.explanationFr, source: "writing" }, now);
        }
        const avg = Object.values(fb.scores).reduce((a, b) => a + b, 0) / 5;
        return addXp(d, XP.writingSubmitted + Math.round((avg / 5) * XP.writingEvaluatedBonus), now);
      }
      return words >= task.minWords ? addXp(d, XP.writingSubmitted, now) : 0;
    });
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  }

  async function submit() {
    setError(null);
    if (!ai.usable) {
      save();
      setSubmitted(true);
      onComplete?.({ evaluated: false });
      return;
    }
    setLoading(true);
    try {
      const fb = await api<WritingFeedback & { topics?: string[] }>("/api/ai/writing", { taskId: task.id, text });
      setFeedback(fb);
      setSubmitted(true);
      save(fb);
      onComplete?.({ rating: Object.values(fb.scores).reduce((a, b) => a + b, 0) / 5, evaluated: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="violet">{GENRE_FR[task.genre]}</Pill>
          <LevelPill level={task.level} />
          <Pill>Registre {task.register === "formal" ? "formel" : task.register === "informal" ? "informel" : "neutre"}</Pill>
          <Pill>{task.minWords}–{task.maxWords} mots</Pill>
        </div>
        <p className="text-lg" lang="en">{task.prompt}</p>
        {!examMode ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-semibold">Structure attendue</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-sm text-muted">{task.structure.map((s) => <li key={s} lang="en">{s}</li>)}</ol>
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold">Langage utile</p>
              <ul className="flex flex-wrap gap-1.5">{task.usefulLanguage.map((u) => <li key={u} className="rounded-lg bg-surface-2 px-2 py-1 text-sm" lang="en">{u}</li>)}</ul>
            </div>
          </div>
        ) : null}
      </Card>

      {!submitted ? (
        <Card className="space-y-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} lang="en" spellCheck={false} aria-label="Votre texte" placeholder="Write your text here…" className="w-full rounded-xl border border-line bg-surface-2 p-4 leading-relaxed outline-none focus:border-primary" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className={cx("text-sm font-semibold", inRange ? "text-green" : words > task.maxWords ? "text-amber" : "text-faint")}>{words} mots {inRange ? "✓" : `(attendu : ${task.minWords}–${task.maxWords})`}</span>
            <Button onClick={submit} loading={loading} disabled={words < Math.min(30, task.minWords)} icon={ai.usable ? "sparkles" : "check"}>
              {ai.usable ? "Envoyer pour correction" : "Enregistrer mon texte"}
            </Button>
          </div>
          {!examMode ? <p className="text-xs text-faint">Brouillon enregistré automatiquement sur cet appareil.</p> : null}
          <AiNotice what="La correction détaillée" />
          {error ? <Notice tone="red" title="Correction impossible">{error} Votre brouillon est conservé.</Notice> : null}
        </Card>
      ) : null}

      {submitted && !feedback ? (
        <Card className="space-y-3">
          <Notice tone="green" icon="check" title="Texte enregistré dans votre historique">Sans IA connectée, votre texte n&apos;est pas noté. Relisez-le avec cette grille :</Notice>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Ai-je répondu à tous les points de la consigne ?</li>
            <li>Mes paragraphes suivent-ils la structure attendue, avec des connecteurs variés ?</li>
            <li>Le registre ({task.register}) est-il respecté du début à la fin ?</li>
            <li>Ai-je vérifié les temps, les accords, les articles et la ponctuation (pas de « comma splice ») ?</li>
          </ul>
        </Card>
      ) : null}

      {feedback ? (
        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl font-bold">Évaluation</h3>
              <Pill tone="violet">Performance estimée : {feedback.cefr}</Pill>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              {([["task", "Réalisation"], ["organisation", "Organisation"], ["vocabulary", "Vocabulaire"], ["grammar", "Grammaire"], ["register", "Registre"]] as const).map(([k, l]) => (
                <div key={k} className="rounded-xl bg-surface-2 p-3 text-center">
                  <p className="font-display text-2xl font-bold">{feedback.scores[k]}<span className="text-sm text-muted">/5</span></p>
                  <p className="text-xs text-muted">{l}</p>
                </div>
              ))}
            </div>
            <Notice tone="blue" icon="sparkles">{feedback.summaryFr}</Notice>
            <p className="text-xs text-faint">Critères inspirés des descripteurs CECRL (évaluation d&apos;entraînement, non officielle).</p>
          </Card>
          <Card className="space-y-4">
            <Tabs label="Versions du texte" value={view} onChange={setView} options={[{ value: "original", label: "Original annoté" }, { value: "corrected", label: "Version corrigée" }, { value: "improved", label: "Version améliorée" }]} />
            {view === "original" ? <Annotated text={text} issues={feedback.issues} /> : <p className="whitespace-pre-wrap leading-relaxed" lang="en">{view === "corrected" ? feedback.corrected : feedback.improved}</p>}
          </Card>
          {feedback.issues.length ? (
            <Card>
              <h3 className="mb-3 font-display text-lg font-bold">Pourquoi ces corrections ?</h3>
              <ol className="space-y-2">
                {feedback.issues.map((iss, i) => (
                  <li key={i} className="rounded-xl border border-line p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{i + 1}.</span>
                      <span className="rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: `color-mix(in srgb, ${CAT_COLOR[iss.category] ?? "var(--red)"} 20%, transparent)` }}>{CAT_FR[iss.category] ?? iss.category}</span>
                      <span className="text-red line-through" lang="en">{iss.original}</span>→<span className="font-semibold text-green" lang="en">{iss.correction}</span>
                    </div>
                    <p className="mt-1 text-muted">{iss.explanationFr}</p>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
