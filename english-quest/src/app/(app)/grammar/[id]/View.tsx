"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Item } from "@/lib/types";
import { getGrammar, grammarItems } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { recordProgress } from "@/lib/engine/actions";
import { weaknesses } from "@/lib/engine/mastery";
import { isLevelUnlocked, seededShuffle } from "@/lib/engine/progression";
import { GrammarExplanation } from "@/components/learn/GrammarExplanation";
import { ExerciseSet, ResultPanel, type SetResult } from "@/components/learn/Exercise";
import { Button, Card, Empty, LevelPill, Notice, PageHeader, Tabs } from "@/components/ui/primitives";

type Tab = "course" | "easy" | "medium" | "hard" | "exam" | "focus";
const LABELS: Record<Tab, string> = { course: "Cours", easy: "Facile", medium: "Intermédiaire", hard: "Difficile", exam: "Mini-examen", focus: "Leçon ciblée" };

export default function View() {
  const { id } = useParams<{ id: string }>();
  const topic = getGrammar(id);
  const { state, act } = useStore();
  useActiveTime("grammar");
  const [tab, setTab] = useState<Tab>("course");
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<SetResult | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("focus")) setTab("focus");
  }, []);

  const weakness = useMemo(() => (state ? weaknesses(state).find((w) => w.topic === id) : undefined), [state, id]);

  /** Leçon ciblée : items déjà ratés + items intermédiaires/difficiles non maîtrisés. */
  const focusItems = useMemo<Item[]>(() => {
    if (!state || !topic) return [];
    const all = grammarItems(topic.id).filter((i) => i.type !== "free");
    const failed = new Set(state.attempts.filter((a) => a.topic === topic.id && !a.correct).map((a) => a.itemId));
    const pick = [...all.filter((i) => failed.has(i.id)), ...seededShuffle(all.filter((i) => !failed.has(i.id) && i.difficulty !== "easy"), run + 5)];
    return pick.slice(0, 10);
  }, [state, topic, run]);

  if (!topic) return <Empty icon="alert" title="Cours introuvable" />;
  if (!state) return null;
  const unlocked = isLevelUnlocked(state, topic.level);
  const items: Item[] = tab === "exam" ? topic.exam : tab === "focus" ? focusItems : tab === "course" ? [] : topic.exercises[tab];

  function done(r: SetResult) {
    setResult(r);
    act((d, now) => void recordProgress(d, `grammar:${topic!.id}:${tab}`, r.score, now, r.score >= 0.7));
  }

  return (
    <div className="space-y-6">
      <PageHeader kicker="Grammar Academy" title={topic.titleFr} subtitle={topic.summaryFr} icon="pen">
        <LevelPill level={topic.level} />
      </PageHeader>

      {weakness?.status === "weak" ? (
        <Notice tone="red" icon="alert" title="Point faible détecté">
          {Math.round(weakness.accuracy * 100)} % de réussite récente{weakness.aiErrors ? ` et ${weakness.aiErrors} erreur(s) relevée(s) dans vos productions` : ""}. Relisez le cours puis faites la leçon ciblée : la notion reviendra dans vos révisions jusqu&apos;à ce qu&apos;elle soit maîtrisée.
        </Notice>
      ) : weakness?.status === "resolved" ? (
        <Notice tone="green" icon="check" title="Difficulté corrigée">Vos dernières réponses sur ce point sont solides. Bravo !</Notice>
      ) : null}

      <Tabs<Tab>
        label="Sections du cours"
        value={tab}
        onChange={(t) => { setTab(t); setResult(null); setRun((r) => r + 1); }}
        options={(["course", "easy", "medium", "hard", "exam", ...(weakness ? (["focus"] as const) : [])] as Tab[]).map((t) => ({
          value: t,
          label: LABELS[t] + (t !== "course" && t !== "focus" && (state.progress[`grammar:${topic.id}:${t}`]?.best ?? 0) >= 0.7 ? " ✓" : ""),
        }))}
      />

      {tab === "course" ? (
        <Card>
          <GrammarExplanation topic={topic} />
          <div className="mt-6 flex justify-end"><Button onClick={() => setTab("easy")} iconRight="arrowRight">Exercice facile</Button></div>
        </Card>
      ) : !unlocked ? (
        <Empty icon="lock" title={`Exercices débloqués au niveau ${topic.level}`}>Vous pouvez lire le cours dès maintenant. <Link href="/map" className="text-primary underline">Voir le parcours</Link></Empty>
      ) : result ? (
        <ResultPanel result={result} passMark={0.7} onRetry={() => { setResult(null); setRun((r) => r + 1); }}>
          {tab !== "exam" && tab !== "focus" ? (
            <Button onClick={() => { setResult(null); setTab(tab === "easy" ? "medium" : tab === "medium" ? "hard" : "exam"); }} iconRight="arrowRight">Niveau suivant</Button>
          ) : null}
        </ResultPanel>
      ) : items.length ? (
        <Card>
          <ExerciseSet key={`${tab}-${run}`} items={items} source="grammar" title={LABELS[tab]} onComplete={done} seed={run} />
        </Card>
      ) : (
        <Empty icon="check" title="Rien à cibler pour l'instant" />
      )}
    </div>
  );
}
