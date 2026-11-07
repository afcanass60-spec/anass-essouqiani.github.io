"use client";

import { listeningTracks } from "@/content";
import { PageHeader, Notice } from "@/components/ui/primitives";
import { ContentList } from "@/components/app/ContentList";

const GENRES: Record<string, string> = { conversation: "Conversation", professional: "Professionnel", interview: "Interview", podcast: "Podcast", news: "Actualités", debate: "Débat", lecture: "Conférence", academic: "Académique" };
const ACC: Record<string, string> = { "en-GB": "UK", "en-US": "US", intl: "International" };

export default function ListeningPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon="headphones" title="Listening Lab" subtitle="Dialogues, interviews, podcasts, actualités, débats et conférences, de plus en plus rapides et complexes. Vitesse réglable, transcription masquée, sous-titres et réécoute par passage." />
      <Notice tone="blue" icon="volume">Les voix sont générées par la synthèse vocale de votre navigateur, avec une voix par personnage et l&apos;accent indiqué (selon les voix installées sur votre appareil).</Notice>
      <ContentList
        icon="headphones"
        entries={listeningTracks.map((t) => ({
          id: t.id,
          href: `/listening/${t.id}`,
          title: t.title,
          level: t.level,
          description: t.context,
          tags: [GENRES[t.genre], ...new Set(t.speakers.map((s) => ACC[s.accent]))],
          progressKey: `listening:${t.id}`,
        }))}
      />
    </div>
  );
}
