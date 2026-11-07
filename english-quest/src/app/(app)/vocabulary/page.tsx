"use client";

import { useEffect, useMemo, useState } from "react";
import type { Theme } from "@/lib/types";
import { THEME_LABELS, vocabulary } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { dayKey } from "@/lib/state";
import { ensureCard } from "@/lib/engine/actions";
import { dueCards, newWordCandidates } from "@/lib/engine/recommend";
import { isLevelUnlocked } from "@/lib/engine/progression";
import { VocabSession, entryFor } from "@/components/learn/VocabSession";
import { WordDetails } from "@/components/learn/shared";
import { Button, Card, Empty, LevelPill, Notice, PageHeader, Pill, Tabs, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

type Tab = "new" | "review" | "themes";
const BATCH = 10;

export default function VocabularyPage() {
  const { state, act } = useStore();
  useActiveTime("vocabulary");
  const [tab, setTab] = useState<Tab>("new");
  const [session, setSession] = useState<{ ids: string[]; mode: "learn" | "review" } | null>(null);
  const [summary, setSummary] = useState<{ correct: number; total: number } | null>(null);
  const [theme, setTheme] = useState<Theme | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "review" || t === "themes") setTab(t);
  }, []);

  const now = Date.now();
  const learnedToday = state?.days[dayKey(now)]?.wordsLearned ?? 0;
  const goal = state?.settings.dailyNewWords ?? 20;
  const remaining = Math.max(0, goal - learnedToday);
  const candidates = useMemo(() => (state ? newWordCandidates(state, 200) : []), [state]);
  const due = useMemo(() => (state ? dueCards(state, now).sort((a, b) => a.due - b.due) : []), [state, now]);

  const filtered = useMemo(
    () =>
      vocabulary.filter(
        (w) =>
          (theme === "all" || w.theme === theme) &&
          (!query || w.word.toLowerCase().includes(query.toLowerCase()) || w.fr.toLowerCase().includes(query.toLowerCase())),
      ),
    [theme, query],
  );

  if (!state) return null;

  if (session) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">{session.mode === "learn" ? "Nouveaux mots" : "Révision espacée"}</h1>
          <Button variant="ghost" size="sm" onClick={() => setSession(null)} icon="x">Quitter</Button>
        </div>
        <VocabSession
          wordIds={session.ids}
          mode={session.mode}
          onFinish={(s) => {
            setSummary(s);
            setSession(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader icon="book" title="Vocabulary Master" subtitle="Mots, phrasal verbs, idiomes et collocations, mémorisés par répétition espacée et récupération active." />

      {summary ? (
        <Notice tone="green" icon="trophy" title={`Séance terminée : ${summary.correct}/${summary.total} réponses correctes`}>
          Les mots ratés reviendront plus tôt dans vos révisions. Les mots réussis seront espacés de plus en plus.
        </Notice>
      ) : null}

      <Tabs<Tab>
        label="Sections du vocabulaire"
        value={tab}
        onChange={setTab}
        options={[
          { value: "new", label: "Nouveaux mots", count: Math.min(remaining, candidates.length) },
          { value: "review", label: "Révision", count: due.length },
          { value: "themes", label: "Thèmes" },
        ]}
      />

      {tab === "new" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="space-y-4 lg:col-span-2">
            <h2 className="font-display text-xl font-bold">Objectif du jour : {goal} mots</h2>
            <p className="text-muted">
              Appris aujourd&apos;hui : <strong className="text-fg">{learnedToday}</strong>. Un mot est compté comme « appris » quand vous savez le retrouver vous-même (rappel), pas seulement le reconnaître.
            </p>
            {candidates.length ? (
              <>
                <ul className="flex flex-wrap gap-2">
                  {candidates.slice(0, BATCH).map((id) => {
                    const w = entryFor(id, state.cards[id]);
                    return w ? <li key={id}><Pill tone="blue">{w.word}</Pill></li> : null;
                  })}
                </ul>
                <Button onClick={() => { setSummary(null); setSession({ ids: candidates.slice(0, Math.min(BATCH, Math.max(remaining, 5))), mode: "learn" }); }} icon="play" size="lg">
                  Apprendre {Math.min(BATCH, Math.max(remaining, 5), candidates.length)} mots
                </Button>
                {remaining === 0 ? <p className="text-sm text-green">Objectif atteint ! Vous pouvez continuer si vous le souhaitez.</p> : null}
              </>
            ) : (
              <Empty icon="unlock" title="Tous les mots de vos niveaux sont dans votre deck">Débloquez le niveau suivant pour découvrir de nouveaux mots, ou ajoutez des mots depuis le Reading Center.</Empty>
            )}
          </Card>
          <Card className="space-y-3">
            <h3 className="font-semibold">Méthode</h3>
            <ol className="space-y-2 text-sm text-muted">
              <li><strong className="text-fg">1. Découverte</strong> — définition, IPA, audio UK/US, exemple, synonymes, collocations.</li>
              <li><strong className="text-fg">2. Reconnaissance</strong> — retrouver le sens parmi plusieurs propositions.</li>
              <li><strong className="text-fg">3. Rappel</strong> — écrire le mot à partir du sens : c&apos;est ce qui ancre la mémoire.</li>
              <li><strong className="text-fg">4. Révisions espacées</strong> — 1 j, 3 j, puis des intervalles croissants (SM-2), avec des phrases en contexte.</li>
            </ol>
          </Card>
        </div>
      ) : null}

      {tab === "review" ? (
        <Card className="space-y-4">
          {due.length ? (
            <>
              <h2 className="font-display text-xl font-bold">{due.length} mot{due.length > 1 ? "s" : ""} à réviser</h2>
              <p className="text-muted">Réviser au bon moment, juste avant l&apos;oubli, est la méthode la plus efficace pour la mémoire à long terme.</p>
              <Button onClick={() => { setSummary(null); setSession({ ids: due.slice(0, 20).map((c) => c.wordId), mode: "review" }); }} icon="repeat" size="lg">
                Réviser {Math.min(20, due.length)} mots
              </Button>
            </>
          ) : (
            <Empty icon="check" title="Aucune révision en attente">
              {Object.keys(state.cards).length ? `Prochaine échéance : ${new Date(Math.min(...Object.values(state.cards).filter((c) => c.reps > 0).map((c) => c.due), Infinity)).toLocaleDateString("fr-FR")}.` : "Apprenez vos premiers mots pour démarrer les révisions."}
            </Empty>
          )}
        </Card>
      ) : null}

      {tab === "themes" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Rechercher un mot</span>
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher (anglais ou français)…" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 outline-none focus:border-primary" />
            </label>
            <select value={theme} onChange={(e) => setTheme(e.target.value as Theme | "all")} aria-label="Thème" className="h-11 rounded-xl border border-line bg-surface px-3">
              <option value="all">Tous les thèmes</option>
              {Object.entries(THEME_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <ul className="grid gap-2">
            {filtered.map((w) => {
              const card = state.cards[w.id];
              const unlocked = isLevelUnlocked(state, w.level);
              return (
                <li key={w.id} className="card p-0">
                  <button onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id} className="flex w-full items-center gap-3 p-4 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold" lang="en">{w.word}</span>
                      <span className="ml-2 text-sm text-muted">{w.fr}</span>
                    </span>
                    <LevelPill level={w.level} />
                    {card?.learnedAt ? <Icon name="check" size={18} className="text-green" /> : card ? <Icon name="clock" size={18} className="text-primary" /> : null}
                    <Icon name="chevronDown" size={18} className={cx("text-faint transition", open === w.id && "rotate-180")} />
                  </button>
                  {open === w.id ? (
                    <div className="border-t border-line p-4 space-y-3">
                      <WordDetails w={w} />
                      {!card ? (
                        <Button size="sm" variant="secondary" icon="plus" disabled={!unlocked} onClick={() => act((d, n) => void ensureCard(d, w.id, n))}>
                          {unlocked ? "Ajouter à mes révisions" : `Débloqué au niveau ${w.level}`}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
