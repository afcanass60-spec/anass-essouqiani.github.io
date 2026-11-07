import type { LearnerState } from "@/lib/state";
import { chapters, grammarTopics, listeningTracks } from "@/content";
import { playerLevel } from "./xp";

/* =========================================================
   Badges : conditions vérifiées sur l'état réel.
   ========================================================= */

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (s: LearnerState) => boolean;
}

const wordsLearned = (s: LearnerState) => Object.values(s.cards).filter((c) => c.learnedAt).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "placement-done", name: "Pathfinder", description: "Terminer le test de positionnement.", icon: "compass", check: (s) => !!s.profile.placement },
  { id: "first-lesson", name: "First Steps", description: "Terminer une première leçon du parcours.", icon: "flag", check: (s) => Object.keys(s.progress).some((k) => k.startsWith("lesson:") && s.progress[k].completedAt) },
  { id: "first-conversation", name: "First Conversation", description: "Échanger au moins 6 messages avec un personnage IA.", icon: "chat", check: (s) => s.conversations.some((c) => c.messages.filter((m) => m.role === "user").length >= 6) },
  { id: "vocabulary-collector", name: "Vocabulary Collector", description: "Apprendre 100 mots (rappel réussi).", icon: "book", check: (s) => wordsLearned(s) >= 100 },
  { id: "word-hoarder", name: "Word Hoarder", description: "Apprendre 25 mots.", icon: "book", check: (s) => wordsLearned(s) >= 25 },
  {
    id: "grammar-master",
    name: "Grammar Master",
    description: "Obtenir au moins 80 % au mini-examen de 10 cours de grammaire.",
    icon: "pen",
    check: (s) => grammarTopics.filter((t) => (s.progress[`grammar:${t.id}:exam`]?.best ?? 0) >= 0.8).length >= 10,
  },
  {
    id: "listening-expert",
    name: "Listening Expert",
    description: "Obtenir au moins 80 % à toutes les écoutes du Listening Lab.",
    icon: "headphones",
    check: (s) => listeningTracks.every((t) => (s.progress[`listening:${t.id}`]?.best ?? 0) >= 0.8),
  },
  {
    id: "speaking-champion",
    name: "Speaking Champion",
    description: "Réaliser 25 exercices oraux avec un bon résultat.",
    icon: "mic",
    check: (s) =>
      s.speaking.filter((a) => (a.accuracy ?? 0) >= 0.8 || (a.feedback && (a.feedback.scores.fluency + a.feedback.scores.accuracy) / 2 >= 3.5)).length >= 25,
  },
  {
    id: "writing-master",
    name: "Writing Master",
    description: "10 productions écrites évaluées avec une moyenne d'au moins 3,5/5.",
    icon: "feather",
    check: (s) => {
      const ev = s.writing.filter((w) => w.feedback);
      if (ev.length < 10) return false;
      const avg = ev.reduce((a, w) => a + Object.values(w.feedback!.scores).reduce((x, y) => x + y, 0) / 5, 0) / ev.length;
      return avg >= 3.5;
    },
  },
  { id: "first-boss", name: "Boss Slayer", description: "Vaincre un premier boss de chapitre.", icon: "sword", check: (s) => chapters.some((c) => s.progress[`boss:${c.id}`]?.completedAt) },
  { id: "streak-7", name: "On Fire", description: "Série de 7 jours.", icon: "flame", check: (s) => s.streak.best >= 7 },
  { id: "streak-30", name: "Unstoppable", description: "Série de 30 jours.", icon: "flame", check: (s) => s.streak.best >= 30 },
  { id: "level-10", name: "Rising Star", description: "Atteindre le niveau de joueur 10.", icon: "star", check: (s) => playerLevel(s.xp).level >= 10 },
  { id: "b2-unlocked", name: "B2 Unlocked", description: "Valider le niveau B1+ et débloquer B2.", icon: "unlock", check: (s) => !!s.profile.validations["B1+"] },
  { id: "c1-unlocked", name: "Summit in Sight", description: "Débloquer le niveau C1.", icon: "mountain", check: (s) => !!s.profile.validations["B2+"] },
  { id: "c1-master", name: "C1 Master", description: "Valider l'examen de fin de niveau C1.", icon: "crown", check: (s) => s.profile.validations.C1?.source === "exam" },
];

/** Retourne les nouveaux badges débloqués (et les enregistre dans l'état). */
export function checkAchievements(s: LearnerState, now: number): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id] && a.check(s)) {
      s.achievements[a.id] = now;
      unlocked.push(a);
    }
  }
  return unlocked;
}
