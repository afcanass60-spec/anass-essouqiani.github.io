"use client";

import { useMemo } from "react";
import { LEVELS, type Skill } from "@/lib/types";
import { useStore } from "@/lib/store";
import { dayKey, type LearnerState } from "@/lib/state";
import { DAY } from "@/lib/engine/srs";
import { allSkillEstimates, levelObjectives, overallLevel, progressToC1, weaknesses } from "@/lib/engine/mastery";
import { overallPct } from "@/lib/engine/exam";
import { SKILL_COLORS, SKILL_LABELS, formatDate, formatDuration, totalSeconds } from "@/lib/format";
import { getExam, getGrammar } from "@/content";
import { BarChart, LineChart, type Series } from "@/components/app/Charts";
import { Card, Empty, LevelPill, PageHeader, Pill, Stat, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

const WEEKS = 8;

/** Précision hebdomadaire par compétence (tentatives réelles + notes IA /5). */
function weeklySeries(s: LearnerState, skills: Skill[], now: number) {
  const start = now - WEEKS * 7 * DAY;
  const labels = Array.from({ length: WEEKS }, (_, i) => new Date(start + (i + 1) * 7 * DAY).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }));
  const bucket = (ts: number) => Math.floor((ts - start) / (7 * DAY));
  const series: Series[] = skills.map((sk) => {
    const sums = new Array(WEEKS).fill(0);
    const counts = new Array(WEEKS).fill(0);
    if (sk === "speaking" || sk === "writing") {
      const list = sk === "writing"
        ? s.writing.filter((w) => w.feedback).map((w) => ({ ts: w.ts, v: Object.values(w.feedback!.scores).reduce((a, b) => a + b, 0) / 25 }))
        : s.speaking.map((a) => ({ ts: a.ts, v: a.feedback ? (a.feedback.scores.fluency + a.feedback.scores.accuracy + a.feedback.scores.range + a.feedback.scores.coherence) / 20 : a.accuracy ?? null })).filter((x): x is { ts: number; v: number } => x.v !== null);
      for (const x of list) {
        const b = bucket(x.ts);
        if (b >= 0 && b < WEEKS) { sums[b] += x.v; counts[b] += 1; }
      }
    } else {
      for (const a of s.attempts) {
        if (a.skill !== sk || a.source === "placement") continue;
        const b = bucket(a.ts);
        if (b >= 0 && b < WEEKS) { sums[b] += a.correct ? 1 : 0; counts[b] += 1; }
      }
    }
    return { name: SKILL_LABELS[sk], color: SKILL_COLORS[sk], points: sums.map((v, i) => (counts[i] ? v / counts[i] : null)) };
  });
  return { labels, series };
}

export default function StatsPage() {
  const { state } = useStore();
  const now = useMemo(() => Date.now(), []);
  const data = useMemo(() => {
    if (!state) return null;
    const est = allSkillEstimates(state);
    return {
      est,
      overall: overallLevel(est),
      toC1: progressToC1(state),
      main: weeklySeries(state, ["listening", "speaking", "reading", "writing"], now),
      cross: weeklySeries(state, ["grammar", "vocabulary"], now),
      weak: weaknesses(state, now),
    };
  }, [state, now]);
  if (!state || !data) return null;

  const last14 = Array.from({ length: 14 }, (_, i) => now - (13 - i) * DAY);
  const xp14 = last14.map((t) => state.days[dayKey(t)]?.xp ?? 0);
  const time14 = last14.map((t) => Math.round(Object.values(state.days[dayKey(t)]?.seconds ?? {}).reduce((a, b) => a + (b ?? 0), 0) / 60));
  const modules = Object.values(state.days).reduce<Record<string, number>>((acc, d) => {
    for (const [k, v] of Object.entries(d.seconds)) acc[k] = (acc[k] ?? 0) + (v ?? 0);
    return acc;
  }, {});
  const totalAttempts = state.attempts.filter((a) => a.source !== "placement");
  const accuracy = totalAttempts.length ? totalAttempts.filter((a) => a.correct).length / totalAttempts.length : 0;
  const learned = Object.values(state.cards).filter((c) => c.learnedAt).length;
  const mature = Object.values(state.cards).filter((c) => c.interval >= 21).length;

  return (
    <div className="space-y-6">
      <PageHeader icon="chart" title="Statistiques et progression" subtitle="Toutes les données proviennent de votre activité réelle. Les niveaux affichés sont des estimations d'entraînement." />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon="target" label="Niveau global estimé" value={data.overall ?? "—"} hint={`${data.toC1} % du chemin vers C1`} tone="violet" />
        <Stat icon="check" label="Réussite moyenne" value={`${Math.round(accuracy * 100)} %`} hint={`${totalAttempts.length} réponses`} tone="green" />
        <Stat icon="book" label="Mots appris / ancrés" value={`${learned} / ${mature}`} hint="ancré = intervalle ≥ 21 j" tone="blue" />
        <Stat icon="clock" label="Temps total" value={formatDuration(totalSeconds(state))} hint={`${Object.keys(state.days).length} jour(s) d'activité`} tone="amber" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Les 4 compétences (8 semaines)</h2>
          {data.main.series.some((s) => s.points.some((p) => p !== null)) ? <LineChart title="Évolution hebdomadaire des quatre compétences" labels={data.main.labels} series={data.main.series} /> : <Empty icon="chart" title="Pas encore de données">Faites quelques exercices pour voir vos courbes.</Empty>}
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Grammaire et vocabulaire (transversales)</h2>
          {data.cross.series.some((s) => s.points.some((p) => p !== null)) ? <LineChart title="Évolution hebdomadaire de la grammaire et du vocabulaire" labels={data.cross.labels} series={data.cross.series} /> : <Empty icon="chart" title="Pas encore de données" />}
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">Niveau par compétence</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(data.est) as Skill[]).map((k) => (
            <li key={k} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
              <span className="font-medium">{SKILL_LABELS[k]}</span>
              <span className="flex items-center gap-2 text-sm text-muted">{data.est[k].score} pts {data.est[k].level ? <LevelPill level={data.est[k].level!} /> : <Pill>—</Pill>}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">XP sur 14 jours</h2>
          <BarChart title="XP gagnée par jour sur 14 jours" labels={last14.map((t) => String(new Date(t).getDate()))} values={xp14} color="var(--green)" unit=" XP" />
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Temps actif (minutes)</h2>
          <BarChart title="Minutes d'apprentissage actif par jour" labels={last14.map((t) => String(new Date(t).getDate()))} values={time14} color="var(--primary)" unit=" min" />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {Object.entries(modules).sort((a, b) => b[1] - a[1]).map(([k, v]) => <Pill key={k}>{k} · {formatDuration(v)}</Pill>)}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">Référentiel pédagogique (objectifs CECRL)</h2>
        <div className="space-y-5">
          {LEVELS.map((l) => {
            const obj = levelObjectives(state, l);
            const m = obj.filter((o) => o.status === "mastered").length;
            return (
              <details key={l} className="group rounded-xl border border-line" open={l === state.profile.level}>
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                  <LevelPill level={l} />
                  <span className="flex-1 font-semibold">{m}/{obj.length} objectifs maîtrisés</span>
                  <Icon name="chevronDown" size={18} className="text-faint transition group-open:rotate-180" />
                </summary>
                <ul className="space-y-1.5 border-t border-line p-3">
                  {obj.map((o) => (
                    <li key={o.objective.id} className="flex items-start gap-2 text-sm">
                      <Icon name={o.status === "mastered" ? "check" : o.status === "in-progress" ? "clock" : "target"} size={16} className={cx("mt-0.5 shrink-0", o.status === "mastered" ? "text-green" : o.status === "in-progress" ? "text-amber" : "text-faint")} />
                      <span className="flex-1">{o.objective.descriptorFr}</span>
                      <span className="shrink-0 text-xs text-faint">{SKILL_LABELS[o.objective.skill]}{o.evidence ? ` · ${Math.round(o.accuracy * 100)} %` : ""}</span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Points de grammaire suivis</h2>
          {data.weak.length ? (
            <ul className="space-y-2">
              {data.weak.map((w) => (
                <li key={w.topic} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                  <span className="flex-1 font-medium">{getGrammar(w.topic)?.titleFr}</span>
                  <span className="text-muted">{Math.round(w.accuracy * 100)} %</span>
                  <Pill tone={w.status === "weak" ? "red" : w.status === "improving" ? "amber" : "green"}>{w.status === "weak" ? "Faible" : w.status === "improving" ? "En progrès" : "Corrigé"}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="check" title="Aucune difficulté récurrente détectée" />
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">Historique des résultats</h2>
          {state.exams.length ? (
            <ul className="space-y-2">
              {[...state.exams].reverse().slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                  <Icon name={e.kind === "boss" ? "sword" : "trophy"} size={16} className="text-muted" />
                  <span className="flex-1">{e.kind === "boss" ? `Boss ${e.examId.slice(5)}` : e.kind === "level" ? `Validation ${e.level}` : getExam(e.examId)?.title}</span>
                  <span className="text-faint">{formatDate(e.finishedAt)}</span>
                  <Pill tone={e.passed === false ? "red" : "blue"}>{Math.round(overallPct(e.results) * 100)} %</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon="trophy" title="Aucun boss ni examen pour l'instant" />
          )}
        </Card>
      </div>
    </div>
  );
}
