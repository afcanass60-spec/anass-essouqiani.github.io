"use client";

import Link from "next/link";
import type { Cefr } from "@/lib/types";
import { useStore } from "@/lib/store";
import { isLevelUnlocked } from "@/lib/engine/progression";
import { LevelPill, Pill, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export interface ListEntry {
  id: string;
  href: string;
  title: string;
  level: Cefr;
  tags: string[];
  description: string;
  progressKey: string;
}

/** Liste de contenus avec niveau, état (fait / meilleur score) et verrouillage par niveau. */
export function ContentList({ entries, icon }: { entries: ListEntry[]; icon: string }) {
  const { state } = useStore();
  if (!state) return null;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {entries.map((e) => {
        const p = state.progress[e.progressKey];
        const unlocked = isLevelUnlocked(state, e.level);
        const inner = (
          <>
            <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", p?.completedAt ? "bg-green-soft text-green" : "bg-primary-soft text-primary")}>
              <Icon name={!unlocked ? "lock" : p?.completedAt ? "check" : icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{e.title}</span>
                <LevelPill level={e.level} />
              </span>
              <span className="mt-0.5 block text-sm text-muted line-clamp-2">{e.description}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {e.tags.map((t) => <Pill key={t}>{t}</Pill>)}
                {p ? <Pill tone="green">Meilleur score {Math.round(p.best * 100)} %</Pill> : null}
              </span>
            </span>
          </>
        );
        return (
          <li key={e.id}>
            {unlocked ? (
              <Link href={e.href} className="card flex items-start gap-3 p-4 transition hover:-translate-y-0.5">{inner}</Link>
            ) : (
              <div className="card flex items-start gap-3 p-4 opacity-55" aria-disabled title={`Débloqué au niveau ${e.level}`}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
