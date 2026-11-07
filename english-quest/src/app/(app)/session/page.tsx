"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { sessionPlan } from "@/lib/engine/recommend";
import type { Settings } from "@/lib/state";
import { Card, PageHeader, Progress, Tabs, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { Quests } from "@/components/app/Quests";

const BLOCK_ICONS = { vocabulary: "book", grammar: "pen", listening: "headphones", speaking: "mic", review: "repeat" } as const;

export default function SessionPage() {
  const { state, act } = useStore();
  if (!state) return null;
  const plan = sessionPlan(state);
  const total = plan.reduce((a, b) => a + b.minutes, 0);
  const done = plan.filter((b) => b.done).length;
  const set = (patch: Partial<Settings>) => act((d) => void Object.assign(d.settings, patch), { silent: true });

  return (
    <div className="space-y-6">
      <PageHeader icon="bolt" title="Séance du jour" subtitle="Une séance équilibrée générée à partir de votre progression, de vos révisions dues et de vos points faibles. Chaque bloc se coche automatiquement selon votre activité réelle." />
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-sm text-muted">Durée</p>
            <Tabs<string> label="Durée de séance" value={String(state.settings.sessionMinutes)} onChange={(v) => set({ sessionMinutes: Number(v) as Settings["sessionMinutes"] })} options={[{ value: "30", label: "30 min" }, { value: "45", label: "45 min" }, { value: "60", label: "60 min" }]} />
          </div>
          <div>
            <p className="text-sm text-muted">Mode</p>
            <Tabs<Settings["mode"]> label="Intensité" value={state.settings.mode} onChange={(v) => set({ mode: v, dailyNewWords: v === "light" ? 10 : v === "intensive" ? 30 : 20 })} options={[{ value: "light", label: "Léger" }, { value: "normal", label: "Normal" }, { value: "intensive", label: "Intensif" }]} />
          </div>
          <div className="ml-auto text-right">
            <p className="font-display text-2xl font-bold">{done}/{plan.length}</p>
            <p className="text-sm text-muted">blocs · ≈ {total} min</p>
          </div>
        </div>
        <Progress value={done / plan.length} tone="grad" height={10} label="Avancement de la séance" />
      </Card>
      <ol className="grid gap-3">
        {plan.map((b, i) => (
          <li key={b.id}>
            <Link href={b.href} className={cx("card flex items-center gap-4 p-4 transition hover:-translate-y-0.5", b.done && "opacity-70")}>
              <span className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", b.done ? "bg-green text-[#04130b]" : "bg-primary-soft text-primary")}>
                <Icon name={b.done ? "check" : BLOCK_ICONS[b.id]} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">{i + 1}. {b.title} <span className="text-xs font-normal text-faint">{b.minutes} min</span></span>
                <span className="block text-sm text-muted">{b.detail}</span>
                <Progress value={b.progress} tone={b.done ? "green" : "blue"} height={5} className="mt-2" label={b.title} />
              </span>
              <Icon name="chevronRight" className="text-faint" />
            </Link>
          </li>
        ))}
      </ol>
      <Card><Quests /></Card>
    </div>
  );
}
