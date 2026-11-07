"use client";

import { useParams } from "next/navigation";
import { getListening } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { isLevelUnlocked } from "@/lib/engine/progression";
import { ListeningPlayer } from "@/components/learn/ListeningPlayer";
import { Empty, LinkButton, PageHeader } from "@/components/ui/primitives";

export default function ListeningTrackPage() {
  const { id } = useParams<{ id: string }>();
  const track = getListening(id);
  const { state } = useStore();
  useActiveTime("listening");
  if (!track || id.startsWith("x-")) return <Empty icon="alert" title="Écoute introuvable" />;
  if (state && !isLevelUnlocked(state, track.level)) return <Empty icon="lock" title={`Écoute débloquée au niveau ${track.level}`} />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader kicker="Listening Lab" title={track.title} icon="headphones">
        <LinkButton href="/listening" variant="ghost" icon="arrowLeft">Toutes les écoutes</LinkButton>
      </PageHeader>
      <ListeningPlayer track={track} />
    </div>
  );
}
