"use client";

import { useParams } from "next/navigation";
import { getWriting } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { recordProgress } from "@/lib/engine/actions";
import { isLevelUnlocked } from "@/lib/engine/progression";
import { WritingTaskView } from "@/components/learn/WritingTaskView";
import { Empty, LinkButton, PageHeader } from "@/components/ui/primitives";

export default function View() {
  const { id } = useParams<{ id: string }>();
  const task = getWriting(id);
  const { state, act } = useStore();
  useActiveTime("writing");
  if (!task) return <Empty icon="alert" title="Sujet introuvable" />;
  if (state && !isLevelUnlocked(state, task.level)) return <Empty icon="lock" title={`Sujet débloqué au niveau ${task.level}`} />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader kicker="Writing Workshop" title={task.title} icon="feather">
        <LinkButton href="/writing" variant="ghost" icon="arrowLeft">Tous les sujets</LinkButton>
      </PageHeader>
      <WritingTaskView key={task.id} task={task} onComplete={(o) => act((d, now) => void recordProgress(d, `writing:${task.id}`, o.rating ? o.rating / 5 : 0, now, true), { silent: true })} />
    </div>
  );
}
