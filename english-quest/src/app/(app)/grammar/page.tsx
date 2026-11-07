"use client";

import Link from "next/link";
import { LEVELS } from "@/lib/types";
import { grammarTopics, LEVEL_INFO } from "@/content";
import { useStore } from "@/lib/store";
import { weaknesses } from "@/lib/engine/mastery";
import { isLevelUnlocked } from "@/lib/engine/progression";
import { LevelPill, Notice, PageHeader, Pill, Progress } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export default function GrammarPage() {
  const { state } = useStore();
  if (!state) return null;
  const weak = new Map(weaknesses(state).map((w) => [w.topic, w]));
  return (
    <div className="space-y-8">
      <PageHeader icon="pen" title="Grammar Academy" subtitle="Tous les points de grammaire du B1 au C1 : explication en français et en anglais, exemples, erreurs fréquentes, exercices facile / intermédiaire / difficile et mini-examen." />
      {[...weak.values()].some((w) => w.status === "weak") ? (
        <Notice tone="red" icon="alert" title="Points faibles détectés">
          {[...weak.values()].filter((w) => w.status === "weak").map((w) => w.title).join(", ")} — commencez par ces cours (exercices ciblés).
        </Notice>
      ) : null}
      {LEVELS.map((level) => {
        const topics = grammarTopics.filter((t) => t.level === level);
        const unlocked = isLevelUnlocked(state, level);
        return (
          <section key={level}>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold"><LevelPill level={level} /> {LEVEL_INFO[level].nameFr}{!unlocked ? <Icon name="lock" size={16} className="text-faint" /> : null}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((t) => {
                const levels = (["easy", "medium", "hard", "exam"] as const).map((k) => state.progress[`grammar:${t.id}:${k}`]?.best ?? 0);
                const done = levels.filter((x) => x >= 0.7).length;
                const w = weak.get(t.id);
                return (
                  <Link key={t.id} href={`/grammar/${t.id}`} className="card p-4 transition hover:-translate-y-0.5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-semibold">{t.titleFr}</p>
                      {w?.status === "weak" ? <Pill tone="red" icon="alert">À revoir</Pill> : w?.status === "resolved" ? <Pill tone="green" icon="check">Corrigé</Pill> : !unlocked ? <Pill tone="gray" icon="lock">Aperçu</Pill> : null}
                    </div>
                    <p className="text-sm text-muted" lang="en">{t.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-faint">{t.summaryFr}</p>
                    <div className="mt-3 flex items-center gap-2"><Progress value={done / 4} height={6} label={`Progression ${t.titleFr}`} /><span className="text-xs text-faint">{done}/4</span></div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
