"use client";

import { useState } from "react";
import { writingTasks, getWriting } from "@/content";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/format";
import { Card, Empty, PageHeader, Pill } from "@/components/ui/primitives";
import { ContentList } from "@/components/app/ContentList";
import { Annotated } from "@/components/learn/WritingTaskView";

export default function WritingPage() {
  const { state } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  if (!state) return null;
  const history = [...state.writing].reverse();
  return (
    <div className="space-y-8">
      <PageHeader icon="feather" title="Writing Workshop" subtitle="Emails, lettres, comptes rendus, essais, articles, rapports, propositions et textes académiques — corrigés selon des critères proches du CECRL, avec la version originale annotée et une version améliorée." />
      <ContentList
        icon="feather"
        entries={writingTasks.map((t) => ({ id: t.id, href: `/writing/${t.id}`, title: t.title, level: t.level, description: t.prompt, tags: [`${t.minWords}–${t.maxWords} mots`], progressKey: `writing:${t.id}` }))}
      />
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Mes productions</h2>
        {history.length ? (
          <ul className="space-y-2">
            {history.map((w) => {
              const avg = w.feedback ? Object.values(w.feedback.scores).reduce((a, b) => a + b, 0) / 5 : null;
              return (
                <li key={w.id} className="card p-0">
                  <button className="flex w-full flex-wrap items-center gap-3 p-4 text-left" onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}>
                    <span className="flex-1 font-semibold">{getWriting(w.taskId)?.title ?? w.taskId}</span>
                    <span className="text-sm text-muted">{formatDate(w.ts)} · {w.wordCount} mots</span>
                    {avg !== null ? <Pill tone="violet">{avg.toFixed(1)}/5 · {w.feedback!.cefr}</Pill> : <Pill>Non évalué</Pill>}
                  </button>
                  {open === w.id ? <div className="border-t border-line p-4">{w.feedback ? <Annotated text={w.text} issues={w.feedback.issues} /> : <p className="whitespace-pre-wrap" lang="en">{w.text}</p>}</div> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon="feather" title="Aucune production pour l'instant">Choisissez un sujet ci-dessus.</Empty>
        )}
      </section>
      <Card className="text-sm text-muted">Astuce : vos erreurs récurrentes à l&apos;écrit alimentent la détection de points faibles et les recommandations de grammaire.</Card>
    </div>
  );
}
