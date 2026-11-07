"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AutoItem, Correction, FreeItem, Item } from "@/lib/types";
import type { Source } from "@/lib/state";
import { checkItem, isAuto, wordCount, type Response } from "@/lib/engine/answer";
import { recordAttempt, recordCorrections } from "@/lib/engine/actions";
import { seededShuffle } from "@/lib/engine/progression";
import { ApiError, useApi, useStore } from "@/lib/store";
import { useAiStatus } from "@/lib/useAi";
import { Button, Notice, Pill, Progress, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/* =========================================================
   Affichage et correction d'un item, et enchaînement d'une série
   ========================================================= */

const DIFF: Record<string, { label: string; tone: "green" | "blue" | "violet" }> = {
  easy: { label: "Facile", tone: "green" },
  medium: { label: "Intermédiaire", tone: "blue" },
  hard: { label: "Difficile", tone: "violet" },
};

export interface ItemOutcome {
  correct: boolean;
  /** Item non évalué (production libre sans IA). */
  skipped?: boolean;
}

function GapText({ text, values, setValues, disabled, perGap, hint }: { text: string; values: string[]; setValues: (v: string[]) => void; disabled: boolean; perGap?: boolean[]; hint?: string }) {
  const parts = text.split("___");
  return (
    <p className="text-lg leading-[2.4]">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 ? (
            <input
              aria-label={`Réponse ${i + 1}`}
              value={values[i] ?? ""}
              disabled={disabled}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                setValues(next);
              }}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={hint && parts.length === 2 ? "…" : "…"}
              className={cx(
                "mx-1 inline-block min-w-[7rem] rounded-lg border-2 bg-surface-2 px-2 py-0.5 text-center text-base font-semibold outline-none transition focus:border-primary",
                perGap ? (perGap[i] ? "border-green text-green" : "border-red text-red") : "border-line",
              )}
              style={{ width: `${Math.max(7, (values[i]?.length ?? 0) + 3)}ch` }}
            />
          ) : null}
        </span>
      ))}
    </p>
  );
}

function OrderInput({ words, seed, value, setValue, disabled }: { words: string[]; seed: number; value: number[]; setValue: (v: number[]) => void; disabled: boolean }) {
  const shuffled = useMemo(() => seededShuffle(words.map((w, i) => ({ w, i })), seed), [words, seed]);
  return (
    <div className="space-y-4">
      <div className="min-h-14 rounded-xl border-2 border-dashed border-line p-2 flex flex-wrap gap-2" aria-label="Phrase en construction">
        {value.length === 0 ? <span className="px-2 py-1.5 text-sm text-faint">Touchez les mots dans l&apos;ordre…</span> : null}
        {value.map((idx, k) => (
          <button key={k} disabled={disabled} onClick={() => setValue(value.filter((_, j) => j !== k))} className="rounded-lg bg-primary-soft px-3 py-1.5 font-semibold text-primary">
            {words[idx]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {shuffled.map(({ w, i }) => (
          <button key={i} disabled={disabled || value.includes(i)} onClick={() => setValue([...value, i])} className={cx("rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-semibold transition", value.includes(i) && "opacity-30")}>
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FreeResult {
  score: number;
  correct: boolean;
  feedbackFr: string;
  corrections: Correction[];
  improved: string;
}

function FreeTask({ item, onDone, source }: { item: FreeItem; onDone: (o: ItemOutcome) => void; source: Source }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<FreeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const ai = useAiStatus();
  const api = useApi();
  const { act } = useStore();
  const words = wordCount(text);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const r = await api<FreeResult>("/api/ai/free", { task: item.task, target: item.target, level: item.level, answer: text });
      setResult(r);
      act((d, now) => {
        const xp = recordAttempt(d, item, r.correct, source, now, { response: text });
        recordCorrections(d, r.corrections, "writing", "writing", now);
        return xp;
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">{item.task}</p>
      <p className="text-sm text-muted">
        <Icon name="target" size={14} className="inline mr-1" />
        Objectif : {item.target}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!result}
        rows={6}
        lang="en"
        aria-label="Votre production"
        className="w-full rounded-xl border border-line bg-surface-2 p-3 outline-none focus:border-primary"
        placeholder="Write your answer in English…"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={cx(words >= item.minWords ? "text-green" : "text-faint")}>
          {words} / {item.minWords} mots minimum
        </span>
        {!result ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onDone({ correct: false, skipped: true })}>
              Passer
            </Button>
            {ai.configured ? (
              <Button onClick={submit} loading={loading} disabled={words < Math.min(5, item.minWords)} icon="sparkles">
                Corriger avec l&apos;IA
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setShowModel(true)} icon="eye" disabled={words < 3}>
                Comparer au modèle
              </Button>
            )}
          </div>
        ) : null}
      </div>
      {!ai.configured && !ai.loading ? (
        <Notice tone="amber" icon="info" title="Correction IA non disponible">
          Aucun fournisseur IA n&apos;est configuré : cette production ne peut pas être notée automatiquement. Vous pouvez la comparer à un modèle ; elle ne compte pas dans votre score.
        </Notice>
      ) : null}
      {error ? <Notice tone="red" title="La correction a échoué">{error}</Notice> : null}
      {showModel && item.model ? (
        <div className="card-flat p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-faint mb-1">Exemple de réponse</p>
          <p className="whitespace-pre-line" lang="en">{item.model}</p>
          <div className="mt-3 flex justify-end">
            <Button onClick={() => onDone({ correct: false, skipped: true })} iconRight="arrowRight">
              Continuer
            </Button>
          </div>
        </div>
      ) : null}
      {result ? (
        <div className="space-y-3">
          <Notice tone={result.correct ? "green" : "amber"} icon={result.correct ? "check" : "alert"} title={`Note : ${result.score}/5`}>
            {result.feedbackFr}
          </Notice>
          {result.corrections.length ? (
            <ul className="space-y-2">
              {result.corrections.map((c, i) => (
                <li key={i} className="card-flat p-3 text-sm">
                  <span className="line-through text-red">{c.original}</span> → <span className="font-semibold text-green">{c.corrected}</span>
                  <p className="text-muted mt-1">{c.explanationFr}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {result.improved ? (
            <div className="card-flat p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint mb-1">Version améliorée</p>
              <p lang="en">{result.improved}</p>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={() => onDone({ correct: result.correct })} iconRight="arrowRight">
              Continuer
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Un item auto-corrigé avec saisie, vérification et explication. */
export function AutoExercise({
  item,
  source,
  onDone,
  seed = 1,
  record = true,
  revealAnswer = true,
}: {
  item: AutoItem;
  source: Source;
  onDone: (o: ItemOutcome) => void;
  seed?: number;
  /** false = n'enregistre pas la tentative (le parent s'en charge). */
  record?: boolean;
  revealAnswer?: boolean;
}) {
  const { act } = useStore();
  const [mcq, setMcq] = useState<number | null>(null);
  const [gaps, setGaps] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [result, setResult] = useState<ReturnType<typeof checkItem> | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMcq(null);
    setGaps([]);
    setText(item.type === "correct" ? item.sentence : "");
    setOrder([]);
    setResult(null);
  }, [item]);

  useEffect(() => {
    if (result) nextRef.current?.focus();
  }, [result]);

  const response: Response | null =
    item.type === "mcq" ? mcq : item.type === "gap" ? gaps : item.type === "order" ? order.map((i) => item.words[i]).join(" ") : text;

  const canCheck =
    item.type === "mcq" ? mcq !== null : item.type === "gap" ? item.answers.every((_, i) => (gaps[i] ?? "").trim()) : item.type === "order" ? order.length === item.words.length : text.trim().length > 1;

  function check() {
    if (!canCheck || response === null || result) return;
    const r = checkItem(item, response);
    setResult(r);
    if (record) {
      const shown = Array.isArray(response) ? response.join(" / ") : typeof response === "number" && item.type === "mcq" ? item.options[response] : String(response);
      act((d, now) => recordAttempt(d, item, r.correct, source, now, { response: shown, expected: r.expected }));
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && item.type !== "mcq") {
      e.preventDefault();
      if (result) onDone({ correct: result.correct });
      else check();
    }
  };

  return (
    <div className="space-y-5" onKeyDown={onKey}>
      {item.instruction ? <p className="text-sm font-medium text-muted">{item.instruction}</p> : null}

      {item.type === "mcq" ? (
        <fieldset>
          <legend className="text-lg font-medium mb-4" lang="en">
            {item.question}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {item.options.map((o, i) => {
              const chosen = mcq === i;
              const state = result ? (i === item.answer ? "right" : chosen ? "wrong" : "idle") : chosen ? "chosen" : "idle";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!!result}
                  aria-pressed={chosen}
                  onClick={() => setMcq(i)}
                  className={cx(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-medium transition",
                    state === "idle" && "border-line bg-surface-2 hover:border-line-strong",
                    state === "chosen" && "border-primary bg-primary-soft",
                    state === "right" && "border-green bg-green-soft",
                    state === "wrong" && "border-red bg-red-soft",
                  )}
                  lang="en"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line text-xs font-bold text-muted">{String.fromCharCode(65 + i)}</span>
                  {o}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {item.type === "gap" ? <GapText text={item.text} values={gaps} setValues={setGaps} disabled={!!result} perGap={result?.perGap} hint={item.hint} /> : null}
      {item.type === "gap" && item.hint && !result ? <p className="text-xs text-faint">Indice : {item.hint}</p> : null}

      {item.type === "transform" ? (
        <div className="space-y-3">
          <p className="text-lg font-medium" lang="en">
            {item.source}
          </p>
          {item.keyword ? (
            <p className="text-sm">
              Mot imposé : <span className="rounded-md bg-violet-soft px-2 py-0.5 font-bold uppercase text-violet">{item.keyword}</span>
            </p>
          ) : null}
          {item.frame ? <p className="text-sm text-muted">Début : <span lang="en" className="font-mono">{item.frame}</span></p> : null}
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={!!result} aria-label="Votre reformulation" lang="en" autoComplete="off" spellCheck={false} className="w-full rounded-xl border-2 border-line bg-surface-2 px-4 py-3 outline-none focus:border-primary" placeholder="Votre phrase…" />
        </div>
      ) : null}

      {item.type === "correct" ? (
        <div className="space-y-3">
          <p className="text-lg font-medium text-red/90 line-through decoration-red/40" lang="en">
            {item.sentence}
          </p>
          <input value={text} onChange={(e) => setText(e.target.value)} disabled={!!result} aria-label="Phrase corrigée" lang="en" autoComplete="off" spellCheck={false} className="w-full rounded-xl border-2 border-line bg-surface-2 px-4 py-3 outline-none focus:border-primary" />
        </div>
      ) : null}

      {item.type === "order" ? <OrderInput words={item.words} seed={seed} value={order} setValue={setOrder} disabled={!!result} /> : null}

      {result ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cx("rounded-2xl border p-4", result.correct ? "border-green/40 bg-green-soft" : "border-red/40 bg-red-soft")} role="status">
          <p className={cx("flex items-center gap-2 font-bold", result.correct ? "text-green" : "text-red")}>
            <Icon name={result.correct ? "check" : "x"} size={18} />
            {result.correct ? "Correct !" : "Pas tout à fait."}
          </p>
          {!result.correct && revealAnswer ? (
            <p className="mt-1 text-sm">
              Réponse attendue : <span className="font-semibold" lang="en">{result.expected}</span>
            </p>
          ) : null}
          {item.explanation ? <p className="mt-1 text-sm text-muted">{item.explanation}</p> : null}
        </motion.div>
      ) : null}

      <div className="flex justify-end">
        {!result ? (
          <Button onClick={check} disabled={!canCheck} icon="check">
            Vérifier
          </Button>
        ) : (
          <Button ref={nextRef} onClick={() => onDone({ correct: result.correct })} iconRight="arrowRight" variant={result.correct ? "success" : "primary"}>
            Continuer
          </Button>
        )}
      </div>
    </div>
  );
}

export function ItemView(props: { item: Item; source: Source; onDone: (o: ItemOutcome) => void; seed?: number; record?: boolean }) {
  if (isAuto(props.item)) return <AutoExercise {...props} item={props.item} />;
  return <FreeTask item={props.item} onDone={props.onDone} source={props.source} />;
}

/* ---------- Série d'exercices ---------- */

export interface SetResult {
  correct: number;
  evaluated: number;
  total: number;
  score: number; // correct / evaluated
}

export function ExerciseSet({
  items,
  source,
  onComplete,
  title,
  seed = 1,
  header,
}: {
  items: Item[];
  source: Source;
  onComplete: (r: SetResult) => void;
  title?: string;
  seed?: number;
  header?: (index: number) => React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<ItemOutcome[]>([]);
  const item = items[index];

  function done(o: ItemOutcome) {
    const next = [...outcomes, o];
    setOutcomes(next);
    if (index + 1 >= items.length) {
      const evaluated = next.filter((x) => !x.skipped).length;
      const correct = next.filter((x) => x.correct).length;
      onComplete({ correct, evaluated, total: items.length, score: evaluated ? correct / evaluated : 0 });
    } else setIndex(index + 1);
  }

  if (!item) return null;
  const diff = item.difficulty ? DIFF[item.difficulty] : null;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Progress value={index / items.length} tone="grad" label="Progression de la série" />
        <span className="shrink-0 text-sm font-semibold text-muted">
          {index + 1}/{items.length}
        </span>
      </div>
      {header?.(index)}
      <div className="flex flex-wrap items-center gap-2">
        {title ? <span className="text-sm font-semibold text-faint">{title}</span> : null}
        {diff ? <Pill tone={diff.tone}>{diff.label}</Pill> : null}
        <Pill tone="gray">{({ mcq: "QCM", gap: "Texte à trous", transform: "Transformation", correct: "Correction d'erreur", order: "Remise en ordre", free: "Production libre" } as const)[item.type]}</Pill>
      </div>
      <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <ItemView item={item} source={source} onDone={done} seed={seed + index} />
      </motion.div>
    </div>
  );
}

export function ResultPanel({ result, onRetry, children, passMark }: { result: SetResult; onRetry?: () => void; children?: React.ReactNode; passMark?: number }) {
  const pct = Math.round(result.score * 100);
  const passed = passMark === undefined || result.score >= passMark;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card p-6 text-center space-y-4">
      <div className={cx("mx-auto grid h-16 w-16 place-items-center rounded-2xl", passed ? "bg-green-soft text-green" : "bg-amber-soft text-amber")}>
        <Icon name={passed ? "trophy" : "repeat"} size={32} />
      </div>
      <div>
        <p className="font-display text-3xl font-bold">{pct} %</p>
        <p className="text-muted">
          {result.correct} bonne{result.correct > 1 ? "s" : ""} réponse{result.correct > 1 ? "s" : ""} sur {result.evaluated} évaluée{result.evaluated > 1 ? "s" : ""}
          {result.evaluated < result.total ? ` (${result.total - result.evaluated} non évaluée${result.total - result.evaluated > 1 ? "s" : ""})` : ""}
        </p>
      </div>
      {passMark !== undefined ? (
        <p className={cx("font-semibold", passed ? "text-green" : "text-amber")}>{passed ? "Objectif atteint !" : `Il faut au moins ${Math.round(passMark * 100)} % pour valider.`}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <Button variant="secondary" onClick={onRetry} icon="repeat">
            Recommencer
          </Button>
        ) : null}
        {children}
      </div>
    </motion.div>
  );
}
