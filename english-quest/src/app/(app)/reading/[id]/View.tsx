"use client";

import { useParams } from "next/navigation";
import { getReading } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { isLevelUnlocked } from "@/lib/engine/progression";
import { ReadingView } from "@/components/learn/ReadingView";
import { Empty, LinkButton, PageHeader } from "@/components/ui/primitives";

export default function View() {
  const { id } = useParams<{ id: string }>();
  const text = getReading(id);
  const { state } = useStore();
  useActiveTime("reading");
  if (!text || id.startsWith("x-")) return <Empty icon="alert" title="Texte introuvable" />;
  if (state && !isLevelUnlocked(state, text.level)) return <Empty icon="lock" title={`Texte débloqué au niveau ${text.level}`} />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader kicker="Reading Center" title={text.title} icon="library">
        <LinkButton href="/reading" variant="ghost" icon="arrowLeft">Tous les textes</LinkButton>
      </PageHeader>
      <ReadingView text={text} />
    </div>
  );
}
