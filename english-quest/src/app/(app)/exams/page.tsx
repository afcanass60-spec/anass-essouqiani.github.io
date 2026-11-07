"use client";

import Link from "next/link";
import { LEVELS } from "@/lib/types";
import { exams, getExam } from "@/content";
import { useStore } from "@/lib/store";
import { isLevelExamUnlocked, isLevelUnlocked } from "@/lib/engine/progression";
import { overallPct } from "@/lib/engine/exam";
import { formatDate } from "@/lib/format";
import { Card, Empty, LevelPill, Notice, PageHeader, Pill } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export default function ExamsPage() {
  const { state } = useStore();
  if (!state) return null;
  const history = [...state.exams].filter((e) => e.kind !== "boss").reverse().slice(0, 12);
  return (
    <div className="space-y-8">
      <PageHeader icon="trophy" title="Exam Center" subtitle="Examens blancs chronométrés (formats inspirés de Cambridge et de l'IELTS) et examens de validation de niveau. Résultat détaillé par compétence." />
      <Notice tone="amber" icon="info" title="Évaluations d'entraînement">Aucun résultat ne constitue une certification officielle. Cambridge English et IELTS sont des marques de leurs propriétaires respectifs ; les sujets proposés ici sont originaux.</Notice>
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Examens blancs</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {exams.map((e) => {
            const unlocked = isLevelUnlocked(state, e.level === "B2+" ? "B2" : e.level) || e.level === "B1";
            return (
              <Link key={e.id} href={unlocked ? `/exam/${e.id}` : "#"} aria-disabled={!unlocked} className={`card p-5 transition ${unlocked ? "hover:-translate-y-0.5" : "pointer-events-none opacity-55"}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <LevelPill level={e.level} />
                  <Pill tone={e.format === "ielts" ? "amber" : "violet"}>{e.format === "ielts" ? "Format IELTS" : "Format Cambridge"}</Pill>
                  <Pill icon="clock">{e.minutes} min</Pill>
                  {!unlocked ? <Pill icon="lock">Verrouillé</Pill> : null}
                </div>
                <p className="font-display text-lg font-bold">{e.title}</p>
                <p className="mt-1 text-sm text-muted">{e.description}</p>
                <p className="mt-2 text-xs text-faint">{e.sections.map((s) => s.title.split(" — ")[0]).join(" · ")}</p>
              </Link>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Validation de niveau</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LEVELS.map((l) => {
            const v = state.profile.validations[l];
            const open = isLevelExamUnlocked(state, l) || !!v;
            return (
              <Link key={l} href={open ? `/exam/level/${encodeURIComponent(l)}` : "#"} aria-disabled={!open} className={`card p-4 text-center ${open ? "hover:-translate-y-0.5" : "pointer-events-none opacity-55"}`}>
                <p className="font-display text-2xl font-bold">{l}</p>
                <p className="mt-1 text-xs text-muted">{v ? (v.source === "exam" ? "Validé ✓" : "Validé par le test") : open ? "Disponible" : "Vaincre les boss"}</p>
                {!open ? <Icon name="lock" size={16} className="mx-auto mt-2 text-faint" /> : null}
              </Link>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">Historique</h2>
        {history.length ? (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id}>
                <Card className="flex flex-wrap items-center gap-3 p-4">
                  <span className="flex-1 font-semibold">{h.kind === "level" ? `Validation ${h.level}` : getExam(h.examId)?.title ?? h.examId}</span>
                  <span className="text-sm text-muted">{formatDate(h.finishedAt)}</span>
                  <Pill tone="blue">{Math.round(overallPct(h.results) * 100)} %</Pill>
                  {h.kind === "level" ? <Pill tone={h.passed ? "green" : "red"}>{h.passed ? "Réussi" : "Non validé"}</Pill> : null}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="trophy" title="Aucun examen passé" />
        )}
      </section>
    </div>
  );
}
