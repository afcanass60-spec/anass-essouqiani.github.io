"use client";

import { useMemo, useState } from "react";
import { useApi, useStore, ApiError } from "@/lib/store";
import { recordWordUse } from "@/lib/engine/actions";
import { entryFor } from "@/components/learn/VocabSession";
import { WordDetails, useAiUsable } from "@/components/learn/shared";
import { Button, Card, Empty, LinkButton, Notice, PageHeader, Tabs, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import type { Card as CardState } from "@/lib/state";

type Filter = "all" | "learning" | "learned" | "mature";

function Meter({ label, c }: { label: string; c: { seen: number; correct: number } }) {
  const pct = c.seen ? c.correct / c.seen : 0;
  return (
    <div className="text-xs">
      <div className="flex justify-between text-muted"><span>{label}</span><span>{c.correct}/{c.seen}</span></div>
      <div className="mt-0.5 h-1.5 rounded-full bg-line-strong/60"><div className="h-full rounded-full bg-primary" style={{ width: `${pct * 100}%` }} /></div>
    </div>
  );
}

function UseIt({ card }: { card: CardState }) {
  const w = entryFor(card.wordId, card)!;
  const api = useApi();
  const { act } = useStore();
  const [sentence, setSentence] = useState("");
  const [res, setRes] = useState<{ correct: boolean; feedbackFr: string; improved: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function check() {
    setLoading(true);
    setErr(null);
    try {
      const r = await api<{ correct: boolean; feedbackFr: string; improved: string }>("/api/ai/word-use", { word: w.word, meaning: w.defEn, sentence });
      setRes(r);
      act((d, now) => recordWordUse(d, card.wordId, r.correct, now), { silent: true });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-2 rounded-xl border border-line p-3">
      <p className="text-sm font-semibold">Utilisez « {w.word} » dans une phrase personnelle</p>
      <div className="flex gap-2">
        <input value={sentence} onChange={(e) => { setSentence(e.target.value); setRes(null); }} lang="en" className="h-10 flex-1 rounded-lg border border-line bg-surface-2 px-3 outline-none focus:border-primary" placeholder="Your sentence…" aria-label={`Phrase avec ${w.word}`} />
        <Button size="sm" onClick={check} loading={loading} disabled={sentence.trim().split(/\s+/).length < 4}>Vérifier</Button>
      </div>
      {err ? <p className="text-sm text-red">{err}</p> : null}
      {res ? <Notice tone={res.correct ? "green" : "amber"} title={res.correct ? "Bien utilisé !" : "À revoir"}>{res.feedbackFr}{res.improved ? <span className="mt-1 block" lang="en">→ {res.improved}</span> : null}</Notice> : null}
    </div>
  );
}

export default function LibraryPage() {
  const { state, act } = useStore();
  const ai = useAiUsable();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const cards = useMemo(() => (state ? Object.values(state.cards).sort((a, b) => b.addedAt - a.addedAt) : []), [state]);
  if (!state) return null;
  const now = Date.now();
  const list = cards.filter((c) => {
    const e = entryFor(c.wordId, c);
    if (!e) return false;
    if (q && !e.word.toLowerCase().includes(q.toLowerCase()) && !e.fr.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "learning") return !c.learnedAt;
    if (filter === "learned") return !!c.learnedAt && c.interval < 21;
    if (filter === "mature") return c.interval >= 21;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader icon="bookmark" title="Bibliothèque personnelle" subtitle="Tous vos mots : ceux du parcours et ceux sauvegardés en lisant ou en conversant. Suivez séparément la reconnaissance, le rappel, l'usage en contexte et l'utilisation spontanée.">
        <LinkButton href="/vocabulary?tab=review" icon="repeat">Réviser</LinkButton>
      </PageHeader>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs<Filter> label="Filtre" value={filter} onChange={setFilter} options={[
          { value: "all", label: "Tous", count: cards.length },
          { value: "learning", label: "À apprendre", count: cards.filter((c) => !c.learnedAt).length },
          { value: "learned", label: "Appris", count: cards.filter((c) => c.learnedAt && c.interval < 21).length },
          { value: "mature", label: "Ancrés", count: cards.filter((c) => c.interval >= 21).length },
        ]} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher dans la bibliothèque" className="h-10 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-primary" />
      </div>
      {list.length ? (
        <ul className="grid gap-2">
          {list.map((c) => {
            const e = entryFor(c.wordId, c)!;
            const due = c.reps > 0 && c.due <= now;
            return (
              <li key={c.wordId} className="card p-0">
                <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(open === c.wordId ? null : c.wordId)} aria-expanded={open === c.wordId}>
                  <span className="min-w-0 flex-1"><span className="font-semibold" lang="en">{e.word}</span> <span className="text-sm text-muted">{e.fr || e.defEn}</span></span>
                  {c.custom ? <span className="text-xs text-violet">perso</span> : null}
                  {due ? <span className="text-xs font-semibold text-amber">à réviser</span> : c.reps ? <span className="text-xs text-faint">dans {Math.max(1, Math.round((c.due - now) / 86400000))} j</span> : null}
                  <Icon name="chevronDown" size={18} className={cx("text-faint transition", open === c.wordId && "rotate-180")} />
                </button>
                {open === c.wordId ? (
                  <div className="space-y-4 border-t border-line p-4">
                    <WordDetails w={e} compact={!!c.custom} />
                    <div className="grid gap-3 sm:grid-cols-4">
                      <Meter label="Reconnaissance" c={c.recognition} />
                      <Meter label="Rappel" c={c.recall} />
                      <Meter label="En contexte" c={c.context} />
                      <Meter label="Utilisation" c={c.use} />
                    </div>
                    {ai.usable ? <UseIt card={c} /> : <p className="text-xs text-faint">La vérification de vos propres phrases nécessite l&apos;IA.</p>}
                    {c.custom ? <Button size="sm" variant="ghost" icon="trash" onClick={() => act((d) => void delete d.cards[c.wordId], { silent: true })}>Retirer de la bibliothèque</Button> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty icon="bookmark" title="Votre bibliothèque est vide">Apprenez des mots dans Vocabulary Master ou touchez un mot dans un texte du Reading Center pour l&apos;ajouter.</Empty>
      )}
      <Card className="text-sm text-muted">Un mot est « appris » après un rappel réussi, « ancré » quand l&apos;intervalle de révision dépasse 21 jours. L&apos;utilisation spontanée (phrase personnelle validée) distingue la mémorisation de la capacité à employer le mot.</Card>
    </div>
  );
}
