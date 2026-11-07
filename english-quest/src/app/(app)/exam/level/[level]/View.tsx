"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LEVELS, type Cefr } from "@/lib/types";
import { useActiveTime, useStore } from "@/lib/store";
import type { ExamResult } from "@/lib/state";
import { validateLevel } from "@/lib/engine/actions";
import { isLevelExamUnlocked, levelExamPlan, nextLevel } from "@/lib/engine/progression";
import { decideLevelExam, type LevelExamDecision } from "@/lib/engine/exam";
import { ExamRunner, ResultsTable, type RunnerSection } from "@/components/learn/ExamRunner";
import { useAiUsable } from "@/components/learn/shared";
import { Card, Empty, LinkButton, Notice, PageHeader } from "@/components/ui/primitives";

export default function View() {
  const params = useParams<{ level: string }>();
  const level = decodeURIComponent(params.level) as Cefr;
  const { state, act } = useStore();
  const ai = useAiUsable();
  useActiveTime("exam");
  const [seed] = useState(() => Math.floor(Math.random() * 10000));
  const [decision, setDecision] = useState<(LevelExamDecision & { results: ExamResult[] }) | null>(null);

  const sections = useMemo<RunnerSection[]>(() => {
    if (!LEVELS.includes(level)) return [];
    const plan = levelExamPlan(level, seed);
    return [
      { skill: "grammar", title: "Grammaire", minutes: 20, items: plan.grammar },
      { skill: "vocabulary", title: "Vocabulaire", minutes: 10, items: plan.vocabulary },
      ...(plan.listening ? [{ skill: "listening" as const, title: "Compréhension orale", minutes: 15, listening: plan.listening }] : []),
      ...(plan.reading ? [{ skill: "reading" as const, title: "Compréhension écrite", minutes: 20, reading: plan.reading }] : []),
      ...(plan.writing ? [{ skill: "writing" as const, title: "Expression écrite", minutes: 40, writing: plan.writing }] : []),
      ...(plan.speaking ? [{ skill: "speaking" as const, title: "Expression orale", minutes: 10, speaking: plan.speaking }] : []),
    ];
  }, [level, seed]);

  if (!LEVELS.includes(level)) return <Empty icon="alert" title="Niveau inconnu" />;
  if (!state) return null;
  if (!isLevelExamUnlocked(state, level) && !state.profile.validations[level])
    return <Empty icon="lock" title={`Examen ${level} verrouillé`}>Vainquez tous les boss du niveau {level} pour y accéder.</Empty>;

  function finish(results: ExamResult[]) {
    const d0 = decideLevelExam(results, ai.usable);
    setDecision({ ...d0, results });
    act((d, now) => {
      const last = d.exams[d.exams.length - 1];
      if (last) last.passed = d0.passed;
      if (d0.passed) validateLevel(d, level, nextLevel(level), "exam", d0.productiveVerified, now);
    });
  }

  const nl = nextLevel(level);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader kicker="Validation de niveau" title={`Examen de fin de niveau ${level}`} subtitle="Grammaire, vocabulaire, écoute, lecture, écrit et oral. Il faut au moins 60 % dans chaque section, 70 % au global et 3/5 aux productions (si l'IA est connectée)." icon="trophy" />
      {!ai.usable && !decision ? (
        <Notice tone="amber" title="Productions non vérifiables">Sans IA connectée, l&apos;écrit et l&apos;oral ne peuvent pas être notés : la validation reposera sur les sections à correction automatique et sera marquée « productions non vérifiées » dans votre profil.</Notice>
      ) : null}
      {!decision ? (
        <ExamRunner examId={`level:${level}`} title={`Validation ${level}`} level={level} kind="level" sections={sections} onFinish={finish} />
      ) : (
        <Card className="space-y-5">
          <div className="text-center">
            <p className="text-5xl" aria-hidden>{decision.passed ? "🏅" : "🧗"}</p>
            <h2 className={`font-display text-2xl font-bold ${decision.passed ? "text-green" : "text-amber"}`}>{decision.passed ? `Niveau ${level} validé !` : "Pas encore validé"}</h2>
            {decision.passed && nl ? <p className="text-muted">Le niveau {nl} est maintenant débloqué.</p> : null}
            {decision.passed && !decision.productiveVerified ? <p className="text-sm text-amber">Productions écrite et orale non vérifiées (IA indisponible).</p> : null}
          </div>
          {!decision.passed ? <Notice tone="amber" title="Ce qu'il manque">{decision.reasons.join(" · ")}</Notice> : null}
          <ResultsTable results={decision.results} />
          <div className="flex justify-center gap-2"><LinkButton href="/map" iconRight="arrowRight">Carte du monde</LinkButton></div>
        </Card>
      )}
    </div>
  );
}
