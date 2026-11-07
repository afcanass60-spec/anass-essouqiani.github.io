"use client";

import { useParams } from "next/navigation";
import { getSpeaking } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { isLevelUnlocked } from "@/lib/engine/progression";
import { SpeakingTaskView } from "@/components/learn/SpeakingTaskView";
import { Empty, LinkButton, PageHeader } from "@/components/ui/primitives";

export default function View() {
  const { id } = useParams<{ id: string }>();
  const task = getSpeaking(id);
  const { state } = useStore();
  useActiveTime("speaking");
  if (!task) return <Empty icon="alert" title="Exercice introuvable" />;
  if (state && !isLevelUnlocked(state, task.level)) return <Empty icon="lock" title={`Exercice débloqué au niveau ${task.level}`} />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader kicker="Speaking Studio" title={task.title} icon="mic">
        <LinkButton href="/speaking" variant="ghost" icon="arrowLeft">Tous les exercices</LinkButton>
      </PageHeader>
      <SpeakingTaskView key={task.id} task={task} />
    </div>
  );
}
