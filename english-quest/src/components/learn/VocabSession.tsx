"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { GapItem, McqItem, VocabEntry } from "@/lib/types";
import { getWord, vocabulary } from "@/content";
import { useStore } from "@/lib/store";
import { ensureCard, recordVocab, type VocabQuestion } from "@/lib/engine/actions";
import { clozeFromExample, seededShuffle } from "@/lib/engine/progression";
import type { Card as CardState } from "@/lib/state";
import { AutoExercise } from "./Exercise";
import { WordDetails } from "./shared";
import { Button, Card, Progress } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

/* =========================================================
   Séance de vocabulaire : découverte → reconnaissance → rappel,
   ou révision espacée des cartes dues (rappel / contexte).
   ========================================================= */

/** Entrée affichable, y compris pour un mot personnel (hors banque). */
export function entryFor(wordId: string, card?: CardState): VocabEntry | null {
  const w = getWord(wordId);
  if (w) return w;
  if (card?.custom)
    return {
      id: wordId,
      word: card.custom.word,
      kind: "word",
      pos: "",
      ipa: card.custom.ipa ?? "/ /",
      level: "B2",
      theme: "daily",
      defEn: card.custom.defEn,
      fr: card.custom.fr ?? "",
      example: card.custom.example ?? "",
    };
  return null;
}

function recognitionItem(w: VocabEntry, seed: number): McqItem {
  const others = seededShuffle(
    vocabulary.filter((x) => x.id !== w.id && x.fr !== w.fr),
    seed,
  ).slice(0, 3);
  const options = seededShuffle([w, ...others], seed + 1);
  return {
    id: `vr-${w.id}`,
    type: "mcq",
    skill: "vocabulary",
    level: w.level,
    question: `Que signifie « ${w.word} » ?`,
    options: options.map((o) => o.fr || o.defEn),
    answer: options.indexOf(w),
    explanation: `${w.word} : ${w.defEn}`,
  };
}

function recallItem(w: VocabEntry, mode: "recall" | "context"): GapItem {
  const cloze = mode === "context" ? clozeFromExample(w) : null;
  return {
    id: `vc-${w.id}`,
    type: "gap",
    skill: "vocabulary",
    level: w.level,
    instruction: cloze ? "Complétez la phrase avec le bon mot ou la bonne expression." : `Écrivez le mot anglais qui correspond à : « ${w.fr || w.defEn} »`,
    text: cloze ?? `${w.defEn} → ___`,
    answers: [[w.word]],
    hint: `${w.word[0]}${"·".repeat(Math.max(0, w.word.length - 1))} (${w.word.length} caractères)`,
    explanation: `“${w.example}”`,
  };
}

interface Step {
  wordId: string;
  kind: "present" | VocabQuestion;
}

export function VocabSession({ wordIds, mode, onFinish }: { wordIds: string[]; mode: "learn" | "review"; onFinish: (stats: { correct: number; total: number }) => void }) {
  const { state, act } = useStore();
  const seed = useMemo(() => Date.now() % 100000, []);
  const [queue, setQueue] = useState<Step[]>(() => {
    if (mode === "learn") return [...wordIds.flatMap((id): Step[] => [{ wordId: id, kind: "present" }, { wordId: id, kind: "recognition" }]), ...wordIds.map((id): Step => ({ wordId: id, kind: "recall" }))];
    return seededShuffle(
      wordIds.map((id) => {
        const c = state?.cards[id];
        const kind: VocabQuestion = !c || c.reps < 2 ? "recall" : (c.reps + seed) % 2 === 0 ? "context" : "recall";
        return { wordId: id, kind };
      }),
      seed,
    );
  });
  const [pos, setPos] = useState(0);
  const [graded] = useState(() => new Set<string>());
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const step = queue[pos];
  const word = step ? entryFor(step.wordId, state?.cards[step.wordId]) : null;

  function advance(extra?: Step, current = stats) {
    const q = extra ? [...queue, extra] : queue;
    if (extra) setQueue(q);
    if (pos + 1 >= q.length) onFinish(current);
    else setPos(pos + 1);
  }

  function answered(correct: boolean) {
    if (!step || step.kind === "present") return;
    // En découverte, seule la question de rappel compte pour la répétition espacée.
    const isGraded = !graded.has(step.wordId) && (mode === "review" || step.kind === "recall");
    if (isGraded) graded.add(step.wordId);
    act((d, now) => recordVocab(d, step.wordId, step.kind as VocabQuestion, correct, now, isGraded));
    const next = { correct: stats.correct + (correct ? 1 : 0), total: stats.total + 1 };
    setStats(next);
    // Un mot raté revient en fin de séance (récupération active), une fois.
    const retry = !correct && queue.filter((x) => x.wordId === step.wordId && x.kind !== "present").length < 4;
    advance(retry ? { wordId: step.wordId, kind: "recall" } : undefined, next);
  }

  if (!step || !word) return null;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Progress value={pos / queue.length} tone="grad" label="Progression de la séance" />
        <span className="shrink-0 text-sm text-muted">{pos + 1}/{queue.length}</span>
      </div>
      <motion.div key={`${pos}-${step.wordId}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6">
          {step.kind === "present" ? (
            <div className="space-y-5">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary"><Icon name="sparkles" size={16} />Nouveau mot</p>
              <WordDetails w={word} />
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    act((d, now) => void ensureCard(d, word.id, now), { silent: true });
                    advance();
                  }}
                  iconRight="arrowRight"
                >
                  J&apos;ai compris
                </Button>
              </div>
            </div>
          ) : (
            <AutoExercise
              key={`${pos}`}
              item={step.kind === "recognition" ? recognitionItem(word, seed + pos) : recallItem(word, step.kind === "context" ? "context" : "recall")}
              source="vocab"
              record={false}
              onDone={(o) => answered(o.correct)}
            />
          )}
        </Card>
      </motion.div>
    </div>
  );
}
