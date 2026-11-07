"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { addXp } from "@/lib/engine/actions";
import { dailyQuestStatus, weeklyQuestStatus, type QuestStatus } from "@/lib/engine/quests";
import { Icon } from "@/components/ui/Icon";
import { Button, Progress, cx } from "@/components/ui/primitives";

function QuestRow({ q }: { q: QuestStatus }) {
  const { act } = useStore();
  return (
    <li className="flex items-center gap-3">
      <div className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", q.done ? "bg-green-soft text-green" : "bg-surface-2 text-muted")}>
        <Icon name={q.done ? "check" : q.icon} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <Link href={q.href} className="block text-sm font-semibold leading-snug hover:text-primary">
          {q.title}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <Progress value={q.value / q.target} tone={q.done ? "green" : "blue"} height={6} label={q.title} />
          <span className="shrink-0 text-xs text-faint">
            {q.value}/{q.target}
          </span>
        </div>
      </div>
      {q.claimed ? (
        <span className="text-xs font-semibold text-green">+{q.reward} XP ✓</span>
      ) : q.done ? (
        <Button size="sm" variant="success" onClick={() => act((d, now) => { d.quests[q.key] = now; return addXp(d, q.reward, now); })}>
          +{q.reward} XP
        </Button>
      ) : (
        <span className="text-xs text-faint">+{q.reward} XP</span>
      )}
    </li>
  );
}

export function Quests({ weekly = true }: { weekly?: boolean }) {
  const { state } = useStore();
  if (!state) return null;
  const now = Date.now();
  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="calendar" size={18} className="text-primary" />Quêtes du jour</h3>
        <ul className="space-y-3">{dailyQuestStatus(state, now).map((q) => <QuestRow key={q.key} q={q} />)}</ul>
      </div>
      {weekly ? (
        <div>
          <h3 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="trophy" size={18} className="text-violet" />Quêtes de la semaine</h3>
          <ul className="space-y-3">{weeklyQuestStatus(state, now).map((q) => <QuestRow key={q.key} q={q} />)}</ul>
        </div>
      ) : null}
    </div>
  );
}
