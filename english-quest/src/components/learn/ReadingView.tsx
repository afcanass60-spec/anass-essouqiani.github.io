"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReadingText, VocabEntry } from "@/lib/types";
import type { Source } from "@/lib/state";
import { vocabulary } from "@/content";
import { slug } from "@/content/vocab/helpers";
import { speak, stopSpeaking } from "@/lib/audio";
import { useApi, useStore, ApiError } from "@/lib/store";
import { ensureCard, recordProgress, today } from "@/lib/engine/actions";
import { wordCount } from "@/lib/engine/answer";
import { ExerciseSet, ResultPanel, type SetResult } from "./Exercise";
import { SpeakButton, WordDetails, useAiUsable } from "./shared";
import { Button, Card, LevelPill, Notice, Pill, Spinner } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/* ---------- Recherche d'un mot ---------- */

const bankIndex = new Map<string, VocabEntry>();
for (const w of vocabulary) bankIndex.set(w.word.toLowerCase(), w);

function lemmaCandidates(raw: string): string[] {
  const w = raw.toLowerCase().replace(/[’']s$/, "");
  const c = [w];
  if (w.endsWith("ies")) c.push(w.slice(0, -3) + "y");
  if (w.endsWith("es")) c.push(w.slice(0, -2));
  if (w.endsWith("s")) c.push(w.slice(0, -1));
  if (w.endsWith("ed")) c.push(w.slice(0, -2), w.slice(0, -1));
  if (w.endsWith("ing")) c.push(w.slice(0, -3), w.slice(0, -3) + "e");
  return c;
}

export function findInBank(word: string): VocabEntry | undefined {
  for (const c of lemmaCandidates(word)) {
    const hit = bankIndex.get(c);
    if (hit) return hit;
  }
  return undefined;
}

interface DictEntry {
  word: string;
  phonetic?: string;
  pos?: string;
  defEn: string;
  example?: string;
  fr?: string;
}

async function lookupDictionary(word: string): Promise<DictEntry | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { word: string; phonetic?: string; phonetics?: { text?: string }[]; meanings?: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[] }[];
    const e = data[0];
    const m = e?.meanings?.[0];
    const d = m?.definitions?.[0];
    if (!d) return null;
    return { word: e.word, phonetic: e.phonetic ?? e.phonetics?.find((p) => p.text)?.text, pos: m.partOfSpeech, defEn: d.definition, example: d.example };
  } catch {
    return null;
  }
}

function WordPopover({ word, context, onClose }: { word: string; context: string; onClose: () => void }) {
  const bank = findInBank(word);
  const { state, act, notify } = useStore();
  const api = useApi();
  const ai = useAiUsable();
  const [dict, setDict] = useState<DictEntry | null>(null);
  const [loading, setLoading] = useState(!bank);
  const [frLoading, setFrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bank) return;
    let alive = true;
    lookupDictionary(word).then((d) => {
      if (!alive) return;
      setDict(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [word, bank]);

  const key = bank ? bank.id : `custom:${slug(word)}`;
  const saved = !!state?.cards[key];

  async function translate() {
    setFrLoading(true);
    setError(null);
    try {
      const r = await api<{ word: string; pos: string; defEn: string; fr: string; example: string }>("/api/ai/define", { word, context });
      setDict((d) => ({ word: r.word || word, phonetic: d?.phonetic, pos: r.pos || d?.pos, defEn: d?.defEn ?? r.defEn, example: d?.example ?? r.example, fr: r.fr }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setFrLoading(false);
    }
  }

  function save() {
    act((d, now) => {
      if (bank) ensureCard(d, bank.id, now);
      else if (dict) ensureCard(d, key, now, { word: dict.word, defEn: dict.defEn, fr: dict.fr, example: dict.example ?? context.slice(0, 200), ipa: dict.phonetic });
    });
    notify("Mot ajouté à votre bibliothèque et à vos révisions");
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[26rem]" role="dialog" aria-label={`Définition de ${word}`}>
      <div className="card max-h-[70vh] overflow-y-auto p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-faint">Dictionnaire</p>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-muted hover:bg-surface-2">
            <Icon name="x" />
          </button>
        </div>
        {bank ? (
          <WordDetails w={bank} compact />
        ) : loading ? (
          <div className="flex items-center gap-2 text-muted"><Spinner size={16} />Recherche…</div>
        ) : dict ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-2xl font-bold" lang="en">{dict.word}</h3>
              <SpeakButton text={dict.word} size="sm" />
            </div>
            <p className="text-sm text-muted">{[dict.pos, dict.phonetic].filter(Boolean).join(" · ")}</p>
            <p lang="en">{dict.defEn}</p>
            {dict.example ? <p className="italic text-muted" lang="en">“{dict.example}”</p> : null}
            {dict.fr ? <p>🇫🇷 {dict.fr}</p> : ai.usable ? (
              <Button size="sm" variant="secondary" onClick={translate} loading={frLoading} icon="globe">Traduction en contexte (IA)</Button>
            ) : null}
            <p className="text-xs text-faint">Source : Free Dictionary API (dictionaryapi.dev)</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-muted">Mot introuvable dans le dictionnaire libre.</p>
            {ai.usable ? <Button size="sm" variant="secondary" onClick={translate} loading={frLoading} icon="sparkles">Expliquer avec l&apos;IA</Button> : null}
          </div>
        )}
        {error ? <p className="mt-2 text-sm text-red">{error}</p> : null}
        <div className="mt-4 flex justify-end">
          {saved ? (
            <Pill tone="green" icon="check">Dans votre bibliothèque</Pill>
          ) : (
            <Button size="sm" onClick={save} disabled={!bank && !dict} icon="bookmark">Sauvegarder</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Texte interactif ---------- */

function Paragraph({ text, onWord }: { text: string; onWord: (w: string, ctx: string) => void }) {
  const tokens = useMemo(() => text.split(/(\s+|[^\w’'-]+)/), [text]);
  return (
    <p className="leading-[1.85] text-[1.05rem] whitespace-pre-line" lang="en">
      {tokens.map((t, i) =>
        /^[A-Za-z][\w’'-]*$/.test(t) ? (
          <span key={i} role="button" tabIndex={0} className="word-token" onClick={() => onWord(t.replace(/[’']s$/, ""), text)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onWord(t, text))}>
            {t.replace(/\*/g, "")}
          </span>
        ) : (
          <span key={i}>{t.replace(/\*/g, "")}</span>
        ),
      )}
    </p>
  );
}

interface FreeResult {
  score: number;
  correct: boolean;
  feedbackFr: string;
  improved: string;
}

export function ReadingView({ text, source = "reading", onComplete, showQuestions = true }: { text: ReadingText; source?: Source; onComplete?: (r: SetResult) => void; showQuestions?: boolean }) {
  const { act } = useStore();
  const api = useApi();
  const ai = useAiUsable();
  const [selected, setSelected] = useState<{ word: string; ctx: string } | null>(null);
  const [phase, setPhase] = useState<"read" | "questions" | "done">("read");
  const [result, setResult] = useState<SetResult | null>(null);
  const [summary, setSummary] = useState("");
  const [summaryFb, setSummaryFb] = useState<FreeResult | null>(null);
  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [reading, setReading] = useState<number | null>(null);

  useEffect(() => () => stopSpeaking(), []);

  function finish(r: SetResult) {
    setResult(r);
    setPhase("done");
    act((d, now) => {
      recordProgress(d, `reading:${text.id}`, r.score, now, true);
      today(d, now).readingDone += 1;
    });
    onComplete?.(r);
  }

  async function submitSummary() {
    setSummaryLoading(true);
    setSummaryErr(null);
    try {
      const r = await api<FreeResult>("/api/ai/free", {
        task: `${text.summaryTask.instruction} Text: "${text.title}" — ${text.paragraphs.join(" ").slice(0, 3500)}`,
        target: "Accurate summary of the main ideas in the learner's own words, appropriate length, cohesive.",
        level: text.level,
        answer: summary,
      });
      setSummaryFb(r);
      act((d, now) => void recordProgress(d, `reading:${text.id}:summary`, r.score / 5, now, r.correct));
    } catch (e) {
      setSummaryErr(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setSummaryLoading(false);
    }
  }

  const words = wordCount(summary);
  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <LevelPill level={text.level} />
          <Pill tone="gray">{text.genre}</Pill>
          <span className="text-sm text-muted">{text.intro}</span>
        </div>
        <Notice tone="blue" icon="info">Touchez un mot pour afficher sa définition, l&apos;écouter et l&apos;ajouter à vos révisions.</Notice>
        <article className="space-y-4">
          <h2 className="font-display text-2xl font-bold" lang="en">{text.title}</h2>
          {text.paragraphs.map((p, i) => (
            <div key={i} className="group relative">
              <button
                onClick={() => {
                  if (reading === i) {
                    stopSpeaking();
                    setReading(null);
                  } else {
                    stopSpeaking();
                    setReading(i);
                    speak(p.replace(/\*/g, ""), { onEnd: () => setReading(null) });
                  }
                }}
                className="absolute -left-1 top-1 hidden h-7 w-7 -translate-x-full place-items-center rounded-full text-faint hover:text-primary sm:grid"
                aria-label={reading === i ? "Arrêter la lecture" : `Lire le paragraphe ${i + 1} à voix haute`}
              >
                <Icon name={reading === i ? "stop" : "volume"} size={16} />
              </button>
              <Paragraph text={p} onWord={(w, ctx) => setSelected({ word: w, ctx })} />
            </div>
          ))}
        </article>
        {text.keyVocab.length ? (
          <div>
            <h3 className="mb-2 font-semibold">Vocabulaire clé</h3>
            <ul className="flex flex-wrap gap-2">
              {text.keyVocab.map((k) => (
                <li key={k.term} className="rounded-xl bg-surface-2 px-3 py-1.5 text-sm">
                  <span className="font-semibold" lang="en">{k.term}</span> — <span className="text-muted">{k.meaning}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {selected ? <WordPopover key={selected.word} word={selected.word} context={selected.ctx} onClose={() => setSelected(null)} /> : null}

      {showQuestions ? (
        phase === "read" ? (
          <div className="flex justify-end">
            <Button onClick={() => setPhase("questions")} iconRight="arrowRight">Questions de compréhension</Button>
          </div>
        ) : phase === "questions" ? (
          <Card>
            <ExerciseSet items={text.questions} source={source} onComplete={finish} title="Compréhension" />
          </Card>
        ) : result ? (
          <div className="space-y-4">
            <ResultPanel result={result} onRetry={() => setPhase("questions")} />
            {text.summaryTask.minWords > 0 ? (
              <Card className="space-y-3">
                <h3 className="font-semibold">Résumé à rédiger</h3>
                <p className="text-sm text-muted">{text.summaryTask.instruction} ({text.summaryTask.minWords}–{text.summaryTask.maxWords} mots)</p>
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} lang="en" disabled={!!summaryFb} aria-label="Votre résumé" className="w-full rounded-xl border border-line bg-surface-2 p-3 outline-none focus:border-primary" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className={words >= text.summaryTask.minWords && words <= text.summaryTask.maxWords ? "text-green" : "text-faint"}>{words} mots</span>
                  {ai.usable ? (
                    <Button onClick={submitSummary} loading={summaryLoading} disabled={words < 10 || !!summaryFb} icon="sparkles">Faire corriger</Button>
                  ) : (
                    <span className="text-xs text-faint">Correction automatique disponible lorsque l&apos;IA est configurée.</span>
                  )}
                </div>
                {summaryErr ? <Notice tone="red">{summaryErr}</Notice> : null}
                {summaryFb ? (
                  <div className="space-y-2">
                    <Notice tone={summaryFb.correct ? "green" : "amber"} title={`Note : ${summaryFb.score}/5`}>{summaryFb.feedbackFr}</Notice>
                    {summaryFb.improved ? <p className="rounded-xl bg-surface-2 p-3 text-sm" lang="en">{summaryFb.improved}</p> : null}
                  </div>
                ) : null}
              </Card>
            ) : null}
          </div>
        ) : null
      ) : null}
    </div>
  );
}
