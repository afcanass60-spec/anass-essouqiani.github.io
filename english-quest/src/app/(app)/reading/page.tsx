"use client";

import { readingTexts } from "@/content";
import { PageHeader } from "@/components/ui/primitives";
import { ContentList } from "@/components/app/ContentList";

const GENRES: Record<string, string> = { news: "Article", story: "Histoire courte", science: "Science", tech: "Technologie", essay: "Essai", academic: "Académique", professional: "Document professionnel" };

export default function ReadingPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon="library" title="Reading Center" subtitle="Textes originaux du B1 au C1 : touchez un mot pour sa définition, sa prononciation et l'ajouter à vos révisions ; questions de compréhension, d'inférence et résumé à rédiger." />
      <ContentList
        icon="library"
        entries={readingTexts.map((t) => ({
          id: t.id,
          href: `/reading/${t.id}`,
          title: t.title,
          level: t.level,
          description: t.intro,
          tags: [GENRES[t.genre], `${t.paragraphs.join(" ").split(/\s+/).length} mots`],
          progressKey: `reading:${t.id}`,
        }))}
      />
    </div>
  );
}
