"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { dayKey } from "@/lib/state";
import { currentStreak } from "@/lib/engine/actions";
import { allSkillEstimates, overallLevel, progressToC1, weaknesses } from "@/lib/engine/mastery";
import { recommendations, sessionPlan } from "@/lib/engine/recommend";
import { dailyGoal, playerLevel, titleFor } from "@/lib/engine/xp";
import { nextLesson } from "@/lib/engine/progression";
import { SKILL_ICONS, SKILL_LABELS, formatDuration, totalSeconds } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { Card, LevelPill, LinkButton, Notice, Progress, Ring, Stat, cx } from "@/components/ui/primitives";
import { Quests } from "@/components/app/Quests";
import { LEVEL_INFO } from "@/content";

export default function DashboardPage() {
  const { state } = useStore();
  if (!state) return null;
  const now = Date.now();
  const today = state.days[dayKey(now)];
  const goal = dailyGoal(state.settings);
  const lvl = playerLevel(state.xp);
  const streak = currentStreak(state, now);
  const est = allSkillEstimates(state);
  const overall = overallLevel(est);
  const toC1 = progressToC1(state);
  const recs = recommendations(state, now).slice(0, 4);
  const plan = sessionPlan(state, now);
  const planDone = plan.filter((b) => b.done).length;
  const wordsLearned = Object.values(state.cards).filter((c) => c.learnedAt).length;
  const lessonsDone = Object.keys(state.progress).filter((k) => k.startsWith("lesson:") && state.progress[k].completedAt).length;
  const conversations = state.conversations.filter((c) => c.messages.some((m) => m.role === "user")).length;
  const nl = nextLesson(state);
  const weak = weaknesses(state, now).filter((w) => w.status === "weak");

  const main = (["listening", "speaking", "reading", "writing"] as const).map((k) => est[k]);
  const practiced = main.filter((e) => e.attempts > 0);
  const strongest = practiced.length ? [...practiced].sort((a, b) => b.score - a.score)[0] : null;
  const weakest = practiced.length > 1 ? [...practiced].sort((a, b) => a.score - b.score)[0] : null;

  return (
    <div className="space-y-6">
      {/* Bandeau principal */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-hero opacity-20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3 min-w-0">
            <p className="text-sm font-semibold text-primary">{titleFor(lvl.level)} · Niveau {lvl.level}</p>
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Hello, {state.profile.displayName} 👋</h1>
            <p className="text-muted max-w-xl">
              Parcours débloqué jusqu&apos;au niveau <strong className="text-fg">{state.profile.level}</strong> — {LEVEL_INFO[state.profile.level].goalFr}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <LinkButton href="/session" icon="bolt">
                Séance du jour ({planDone}/{plan.length})
              </LinkButton>
              {nl?.lesson ? (
                <LinkButton href={`/lesson/${nl.lesson.id}`} variant="secondary" icon="play">
                  {nl.lesson.titleFr}
                </LinkButton>
              ) : nl ? (
                <LinkButton href={`/boss/${nl.chapter.id}`} variant="secondary" icon="sword">
                  Boss : {nl.chapter.boss.name}
                </LinkButton>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Ring value={toC1 / 100} size={120} stroke={10} color="var(--violet)" label={`Progression vers C1 : ${toC1} %`}>
              <div>
                <p className="font-display text-2xl font-bold">{toC1}%</p>
                <p className="text-[0.7rem] text-muted">vers C1</p>
              </div>
            </Ring>
            <div className="space-y-1 text-sm">
              <p className="text-muted">Niveau estimé</p>
              <p className="font-display text-3xl font-bold">{overall ?? "—"}</p>
              <p className="text-xs text-faint max-w-[10rem]">{overall ? "Estimation d'entraînement, non officielle" : "Passez le test ou pratiquez pour obtenir une estimation"}</p>
            </div>
          </div>
        </div>
      </section>

      {!state.profile.placement ? (
        <Notice tone="violet" icon="compass" title="Commencez par le test de positionnement">
          15 à 20 minutes pour mesurer votre niveau réel en grammaire, vocabulaire, lecture et écoute. Le parcours s&apos;adapte à vos résultats.{" "}
          <Link href="/placement" className="font-semibold text-primary underline">
            Passer le test
          </Link>
        </Notice>
      ) : null}

      {/* Statistiques */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Statistiques clés">
        <Stat icon="bolt" label="XP du jour" value={`${today?.xp ?? 0} / ${goal}`} hint="objectif quotidien" tone="green" />
        <Stat icon="flame" label="Série" value={`${streak} j`} hint={`record : ${state.streak.best} j`} tone="amber" />
        <Stat icon="book" label="Mots appris" value={wordsLearned} hint={`${Object.keys(state.cards).length} dans votre deck`} tone="blue" />
        <Stat icon="clock" label="Temps d'apprentissage" value={formatDuration(totalSeconds(state))} hint={`${lessonsDone} leçon(s) · ${conversations} conversation(s)`} tone="violet" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Recommandations */}
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Icon name="sparkles" className="text-violet" />Recommandé pour vous</h2>
            <ul className="space-y-2">
              {recs.map((r) => (
                <li key={r.id}>
                  <Link href={r.href} className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition hover:border-line hover:bg-surface-2">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon name={r.icon} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{r.title}</p>
                      <p className="text-sm text-muted">{r.reason}</p>
                    </div>
                    <Icon name="chevronRight" className="text-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* Compétences */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Icon name="chart" className="text-primary" />Compétences</h2>
              <Link href="/stats" className="text-sm font-semibold text-primary hover:underline">Détails</Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {(["listening", "speaking", "reading", "writing", "grammar", "vocabulary"] as const).map((k) => {
                const e = est[k];
                return (
                  <li key={k} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium"><Icon name={SKILL_ICONS[k]} size={16} className="text-muted" />{SKILL_LABELS[k]}</span>
                      {e.level ? <LevelPill level={e.level} /> : <span className="text-xs text-faint">à évaluer</span>}
                    </div>
                    <Progress value={e.score / 100} tone={k === "grammar" || k === "vocabulary" ? "violet" : "blue"} label={SKILL_LABELS[k]} />
                    <p className="text-xs text-faint">{e.attempts ? `${e.attempts} réponse(s) analysée(s)` : e.source === "placement" ? "Estimation issue du test de positionnement" : "Pas encore de données"}</p>
                  </li>
                );
              })}
            </ul>
            {strongest || weakest || weak.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {strongest ? <Notice tone="green" icon="star" title={`Point fort : ${SKILL_LABELS[strongest.skill]}`} /> : null}
                {weakest && weakest !== strongest ? <Notice tone="amber" icon="target" title={`À renforcer : ${SKILL_LABELS[weakest.skill]}`} /> : null}
                {weak.slice(0, 2).map((w) => (
                  <Link key={w.topic} href={`/grammar/${w.topic}?focus=1`} className={cx("sm:col-span-2")}>
                    <Notice tone="red" icon="alert" title={`Difficulté récurrente : ${w.title}`}>
                      {Math.round(w.accuracy * 100)} % de réussite récente — une leçon ciblée vous attend.
                    </Notice>
                  </Link>
                ))}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Objectif du jour</h2>
              <span className="text-sm text-muted">{today?.xp ?? 0}/{goal} XP</span>
            </div>
            <Progress value={(today?.xp ?? 0) / goal} tone="green" height={10} label="Objectif d'XP du jour" />
            <ul className="mt-4 space-y-2">
              {plan.map((b) => (
                <li key={b.id} className="flex items-center gap-2 text-sm">
                  <Icon name={b.done ? "check" : "clock"} size={16} className={b.done ? "text-green" : "text-faint"} />
                  <Link href={b.href} className={cx("flex-1 hover:text-primary", b.done && "text-muted line-through")}>{b.title}</Link>
                  <span className="text-xs text-faint">{b.minutes} min</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <Quests />
          </Card>
          <Card>
            <h2 className="mb-2 font-display text-lg font-bold">Niveau de joueur</h2>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-hero font-display text-xl font-bold text-white">{lvl.level}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{titleFor(lvl.level)}</p>
                <Progress value={lvl.progress} tone="grad" label="Progression du niveau de joueur" />
                <p className="mt-1 text-xs text-faint">{state.xp - lvl.current} / {lvl.next - lvl.current} XP avant le niveau {lvl.level + 1}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
