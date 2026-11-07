import type { ExamResult } from "@/lib/state";
import { LEVEL_EXAM_PASS } from "./progression";

/* Interprétation des résultats d'examen (évaluations d'entraînement). */

export function autoPct(results: ExamResult[]): number {
  const auto = results.filter((r) => r.evaluated && r.max > 0 && r.rating === undefined);
  return auto.length ? auto.reduce((a, r) => a + r.score / r.max, 0) / auto.length : 0;
}

export function overallPct(results: ExamResult[]): number {
  const ev = results.filter((r) => r.evaluated && r.max > 0);
  return ev.length ? ev.reduce((a, r) => a + r.score / r.max, 0) / ev.length : 0;
}

export function mockVerdict(pct: number): { label: string; tone: "green" | "blue" | "amber" | "red" } {
  if (pct >= 0.8) return { label: "Niveau visé atteint avec aisance", tone: "green" };
  if (pct >= 0.6) return { label: "Niveau visé atteint", tone: "blue" };
  if (pct >= 0.45) return { label: "Proche du niveau visé", tone: "amber" };
  return { label: "En dessous du niveau visé", tone: "red" };
}

/** Estimation indicative d'une « band » de type IELTS à partir du pourcentage global. */
export function ieltsBandEstimate(pct: number): number {
  return Math.min(9, Math.max(3, Math.round((3.5 + pct * 5) * 2) / 2));
}

export interface LevelExamDecision {
  passed: boolean;
  productiveVerified: boolean;
  reasons: string[];
}

export function decideLevelExam(results: ExamResult[], aiAvailable: boolean): LevelExamDecision {
  const reasons: string[] = [];
  const auto = results.filter((r) => r.rating === undefined && r.max > 0);
  for (const r of auto) if (r.score / r.max < LEVEL_EXAM_PASS.section) reasons.push(`Section ${r.skill} sous ${Math.round(LEVEL_EXAM_PASS.section * 100)} %`);
  const overall = autoPct(results);
  if (overall < LEVEL_EXAM_PASS.overall) reasons.push(`Score global ${Math.round(overall * 100)} % (minimum ${Math.round(LEVEL_EXAM_PASS.overall * 100)} %)`);
  const productive = results.filter((r) => r.skill === "writing" || r.skill === "speaking");
  const evaluated = productive.filter((r) => r.evaluated && r.rating !== undefined);
  for (const r of evaluated) if ((r.rating ?? 0) < LEVEL_EXAM_PASS.productive) reasons.push(`${r.skill === "writing" ? "Écrit" : "Oral"} : ${r.rating?.toFixed(1)}/5 (minimum ${LEVEL_EXAM_PASS.productive})`);
  if (aiAvailable && evaluated.length < 2) reasons.push("Les productions écrite et orale doivent être réalisées et évaluées");
  return { passed: reasons.length === 0, productiveVerified: evaluated.length >= 2, reasons };
}
