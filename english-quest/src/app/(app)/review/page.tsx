"use client";

import { useMemo, useState } from "react";
import type { Item } from "@/lib/types";
import { getWord, itemIndex } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { dueCards, dueItems } from "@/lib/engine/recommend";
import { vocabItem } from "@/lib/engine/progression";
import { ExerciseSet, ResultPanel, type SetResult } from "@/components/learn/Exercise";
import { VocabSession } from "@/components/learn/VocabSession";
import { Button, Card, Empty, LinkButton, PageHeader, Stat } from "@/components/ui/primitives";

function resolveItem(id: string): Item | undefined {
  if (id.startsWith("vq-")) {
    const w = getWord(id.slice(3));
    return w ? vocabItem(w) : undefined;
  }
  return itemIndex.get(id);
}

export default function ReviewPage() {
  const { state } = useStore();
  useActiveTime("review");
  const [mode, setMode] = useState<"menu" | "items" | "words" | "done">("menu");
  const [result, setResult] = useState<SetResult | null>(null);
  const now = useMemo(() => Date.now(), []);
  const items = useMemo(() => (state ? dueItems(state, now).map(resolveItem).filter((x): x is Item => !!x).slice(0, 15) : []), [state, now]);
  const words = useMemo(() => (state ? dueCards(state, now).slice(0, 20).map((c) => c.wordId) : []), [state, now]);
  const recentErrors = useMemo(() => {
    if (!state) return [];
    const ids = [...new Set(state.errors.filter((e) => e.itemId && !e.itemId.startsWith("word:")).map((e) => e.itemId!).reverse())];
    return ids.map(resolveItem).filter((x): x is Item => !!x).slice(0, 10);
  }, [state]);
  if (!state) return null;

  if (mode === "words") return <div className="mx-auto max-w-2xl"><VocabSession wordIds={words} mode="review" onFinish={() => setMode("done")} /></div>;
  if (mode === "items")
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <ExerciseSet items={items.length ? items : recentErrors} source="review" title="Révision" onComplete={(r) => { setResult(r); setMode("done"); }} />
        </Card>
      </div>
    );
  if (mode === "done")
    return (
      <div className="mx-auto max-w-2xl">
        {result ? <ResultPanel result={result}><Button onClick={() => { setResult(null); setMode("menu"); }}>Retour</Button></ResultPanel> : <Card className="text-center space-y-3"><p className="font-semibold">Révision terminée !</p><Button onClick={() => setMode("menu")}>Retour</Button></Card>}
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader icon="repeat" title="Révisions" subtitle="Les exercices ratés et les mots appris reviennent à intervalles croissants jusqu'à ce qu'ils soient acquis." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat icon="target" label="Exercices à revoir" value={items.length} tone="red" />
        <Stat icon="book" label="Mots à réviser" value={words.length} tone="blue" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold">Exercices ratés</h2>
          {items.length ? (
            <Button onClick={() => setMode("items")} icon="play">Revoir {items.length} exercice(s)</Button>
          ) : recentErrors.length ? (
            <>
              <p className="text-sm text-muted">Rien n&apos;est dû aujourd&apos;hui. Vous pouvez refaire vos dernières erreurs (sans effet sur le calendrier si elles ne sont pas dues).</p>
              <Button variant="secondary" onClick={() => setMode("items")} icon="repeat">Refaire mes dernières erreurs</Button>
            </>
          ) : (
            <Empty icon="check" title="Aucune erreur à revoir">Les exercices ratés apparaîtront ici le lendemain.</Empty>
          )}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-bold">Vocabulaire</h2>
          {words.length ? <Button onClick={() => setMode("words")} icon="play">Réviser {words.length} mot(s)</Button> : <Empty icon="check" title="Aucun mot à réviser"><LinkButton href="/vocabulary" variant="secondary" size="sm">Apprendre de nouveaux mots</LinkButton></Empty>}
        </Card>
      </div>
    </div>
  );
}
