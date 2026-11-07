"use client";

import { speakingTasks, SPEAKING_KIND_LABELS } from "@/content/speaking";
import { PageHeader, Notice } from "@/components/ui/primitives";
import { ContentList } from "@/components/app/ContentList";

const ORDER = ["repeat", "read-aloud", "describe", "question", "story", "opinion", "argue", "interview", "presentation", "debate"] as const;

export default function SpeakingPage() {
  return (
    <div className="space-y-8">
      <PageHeader icon="mic" title="Speaking Studio" subtitle="Parlez réellement anglais : reconnaissance vocale, analyse de l'intelligibilité, du débit et des pauses, et retour détaillé de l'IA sur vos réponses libres." />
      <Notice tone="blue" icon="info" title="Comment c'est évalué ?">
        Les exercices guidés comparent ce que la reconnaissance vocale a compris au texte attendu (intelligibilité, débit, pauses). Les réponses libres sont analysées par l&apos;IA (fluidité, précision, richesse, cohérence). L&apos;accent natif n&apos;est jamais exigé.
      </Notice>
      {ORDER.map((kind, i) => (
        <section key={kind}>
          <h2 className="mb-3 font-display text-lg font-bold">{i + 1}. {SPEAKING_KIND_LABELS[kind]}</h2>
          <ContentList
            icon="mic"
            entries={speakingTasks.filter((t) => t.kind === kind).map((t) => ({ id: t.id, href: `/speaking/${t.id}`, title: t.title, level: t.level, description: t.prompt ?? t.target ?? t.instructionFr, tags: [`${t.seconds} s`], progressKey: `speaking:${t.id}` }))}
          />
        </section>
      ))}
    </div>
  );
}
