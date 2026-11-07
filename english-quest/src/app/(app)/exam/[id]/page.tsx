"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { getExam } from "@/content";
import { useActiveTime } from "@/lib/store";
import type { ExamResult } from "@/lib/state";
import { ExamRunner, ResultsTable } from "@/components/learn/ExamRunner";
import { ieltsBandEstimate, mockVerdict, overallPct } from "@/lib/engine/exam";
import { Card, Empty, LinkButton, Notice, PageHeader } from "@/components/ui/primitives";

export default function MockExamPage() {
  const { id } = useParams<{ id: string }>();
  const exam = getExam(id);
  useActiveTime("exam");
  const [results, setResults] = useState<ExamResult[] | null>(null);
  if (!exam) return <Empty icon="alert" title="Examen introuvable" />;
  const pct = results ? overallPct(results) : 0;
  const verdict = mockVerdict(pct);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader kicker="Exam Center" title={exam.title} subtitle={exam.description} icon="trophy" />
      {!results ? (
        <ExamRunner examId={exam.id} title={exam.title} level={exam.level} kind="mock" sections={exam.sections} onFinish={setResults} />
      ) : (
        <Card className="space-y-5">
          <div className="text-center">
            <p className="text-muted">Score global (sections évaluées)</p>
            <p className="font-display text-5xl font-bold text-gradient">{Math.round(pct * 100)} %</p>
            {exam.format === "ielts" ? <p className="mt-1 text-sm text-muted">Estimation indicative : band ≈ {ieltsBandEstimate(pct)} (approximation d&apos;entraînement, non officielle)</p> : null}
          </div>
          <Notice tone={verdict.tone} title={`${verdict.label} (${exam.level})`}>Résultat d&apos;un examen blanc : il ne constitue pas une certification.</Notice>
          <ResultsTable results={results} />
          <div className="flex justify-center gap-2"><LinkButton href="/exams" variant="secondary" icon="arrowLeft">Exam Center</LinkButton><LinkButton href="/stats" icon="chart">Mes statistiques</LinkButton></div>
        </Card>
      )}
    </div>
  );
}
