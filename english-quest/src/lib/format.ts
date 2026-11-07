import type { LearnerState } from "./state";

export function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")}`;
}

export function totalSeconds(s: LearnerState): number {
  return Object.values(s.days).reduce((a, d) => a + Object.values(d.seconds).reduce((x, y) => x + (y ?? 0), 0), 0);
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export const SKILL_LABELS: Record<string, string> = {
  listening: "Compréhension orale",
  speaking: "Expression orale",
  reading: "Lecture",
  writing: "Expression écrite",
  grammar: "Grammaire",
  vocabulary: "Vocabulaire",
};

export const SKILL_ICONS: Record<string, string> = {
  listening: "headphones",
  speaking: "mic",
  reading: "library",
  writing: "feather",
  grammar: "pen",
  vocabulary: "book",
};

export const SKILL_COLORS: Record<string, string> = {
  listening: "#3d7bff",
  speaking: "#ff5d73",
  reading: "#2fd58b",
  writing: "#ffb547",
  grammar: "#9b6bff",
  vocabulary: "#22c7d6",
};
