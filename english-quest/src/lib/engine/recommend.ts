import type { Cefr, Skill } from "@/lib/types";
import type { LearnerState } from "@/lib/state";
import { dayKey } from "@/lib/state";
import { getGrammar, levelIndex, listeningTracks, readingTexts, vocabulary } from "@/content";
import { allSkillEstimates, weaknesses } from "./mastery";
import { isLevelExamUnlocked, isLevelUnlocked, nextLesson } from "./progression";

/* =========================================================
   Moteur de recommandation pédagogique
   ========================================================= */

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  href: string;
  icon: string;
  priority: number;
}

export const dueCards = (s: LearnerState, now: number) =>
  Object.values(s.cards).filter((c) => c.reps > 0 && c.due <= now);

export const dueItems = (s: LearnerState, now: number) =>
  Object.entries(s.revision)
    .filter(([, r]) => r.due <= now)
    .map(([id]) => id);

/** Mots nouveaux proposés : niveaux débloqués, thèmes des leçons en cours en priorité. */
export function newWordCandidates(s: LearnerState, limit: number): string[] {
  const nl = nextLesson(s);
  const theme = nl?.lesson?.vocabTheme;
  const pendingCustom = Object.values(s.cards)
    .filter((c) => c.custom && c.reps === 0)
    .map((c) => c.wordId);
  const bank = vocabulary
    .filter((w) => (!s.cards[w.id] || s.cards[w.id].reps === 0) && isLevelUnlocked(s, w.level))
    .sort((a, b) => {
      const ta = a.theme === theme ? 0 : 1;
      const tb = b.theme === theme ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return levelIndex(a.level) - levelIndex(b.level);
    })
    .map((w) => w.id);
  return [...pendingCustom, ...bank].slice(0, limit);
}

export function recommendations(s: LearnerState, now = Date.now()): Recommendation[] {
  const recs: Recommendation[] = [];
  if (!s.profile.placement) {
    recs.push({ id: "placement", title: "Passer le test de positionnement", reason: "Il évalue votre niveau réel dans chaque compétence pour adapter le parcours.", href: "/placement", icon: "compass", priority: 100 });
  }
  const cards = dueCards(s, now);
  if (cards.length) {
    recs.push({ id: "review-vocab", title: `Réviser ${cards.length} mot${cards.length > 1 ? "s" : ""}`, reason: "Ces mots arrivent à échéance : les réviser maintenant consolide la mémoire à long terme.", href: "/vocabulary?tab=review", icon: "repeat", priority: 90 });
  }
  const items = dueItems(s, now);
  if (items.length) {
    recs.push({ id: "review-items", title: `Revoir ${items.length} exercice${items.length > 1 ? "s" : ""} raté${items.length > 1 ? "s" : ""}`, reason: "Les exercices échoués reviennent à intervalles croissants jusqu'à ce qu'ils soient acquis.", href: "/review", icon: "target", priority: 85 });
  }
  for (const w of weaknesses(s, now).filter((x) => x.status === "weak").slice(0, 2)) {
    const t = getGrammar(w.topic);
    recs.push({
      id: `weak-${w.topic}`,
      title: `Leçon ciblée : ${w.title}`,
      reason:
        w.aiErrors >= 3
          ? `Erreur récurrente détectée dans vos productions (${w.aiErrors} fois ce mois-ci).`
          : `${Math.round(w.accuracy * 100)} % de réussite sur vos dernières tentatives.`,
      href: `/grammar/${t?.id ?? w.topic}?focus=1`,
      icon: "alert",
      priority: 80,
    });
  }
  const nl = nextLesson(s);
  if (nl?.lesson) {
    recs.push({ id: "next-lesson", title: `Continuer : ${nl.lesson.titleFr}`, reason: `${nl.chapter.level} · ${nl.chapter.titleFr}`, href: `/lesson/${nl.lesson.id}`, icon: "play", priority: 70 });
  } else if (nl && !nl.lesson) {
    recs.push({ id: "boss", title: `Affronter ${nl.chapter.boss.name}`, reason: "Toutes les leçons du chapitre sont terminées : prouvez votre maîtrise.", href: `/boss/${nl.chapter.id}`, icon: "sword", priority: 75 });
  }
  const lvl = s.profile.level;
  if (isLevelExamUnlocked(s, lvl) && !s.profile.validations[lvl]) {
    recs.push({ id: "level-exam", title: `Examen de validation ${lvl}`, reason: "Tous les boss du niveau sont vaincus. Validez le niveau pour débloquer la suite.", href: `/exam/level/${encodeURIComponent(lvl)}`, icon: "trophy", priority: 78 });
  }

  // Compétence la plus faible parmi les 4 compétences principales.
  const est = allSkillEstimates(s);
  const main: Skill[] = ["listening", "reading", "speaking", "writing"];
  const practiced = main.map((k) => est[k]);
  const weakest = practiced.sort((a, b) => a.score - b.score || a.attempts - b.attempts)[0];
  const skillHref: Record<string, string> = { listening: "/listening", reading: "/reading", speaking: "/speaking", writing: "/writing" };
  const skillFr: Record<string, string> = { listening: "la compréhension orale", reading: "la lecture", speaking: "l'expression orale", writing: "l'expression écrite" };
  if (weakest) {
    recs.push({
      id: `skill-${weakest.skill}`,
      title: `Travailler ${skillFr[weakest.skill]}`,
      reason: weakest.attempts === 0 ? "Compétence pas encore pratiquée : équilibrez votre progression." : "C'est actuellement votre compétence la moins solide.",
      href: skillHref[weakest.skill],
      icon: weakest.skill === "listening" ? "headphones" : weakest.skill === "reading" ? "library" : weakest.skill === "speaking" ? "mic" : "pen",
      priority: 50,
    });
  }
  return recs.sort((a, b) => b.priority - a.priority);
}

/* =========================================================
   Séance quotidienne équilibrée
   ========================================================= */

export interface SessionBlock {
  id: "vocabulary" | "grammar" | "listening" | "speaking" | "review";
  title: string;
  minutes: number;
  href: string;
  detail: string;
  done: boolean;
  progress: number;
}

const SPLITS: Record<number, [number, number, number, number, number]> = {
  30: [7, 7, 6, 6, 4],
  45: [10, 10, 10, 10, 5],
  60: [12, 14, 12, 14, 8],
};

export function sessionPlan(s: LearnerState, now = Date.now()): SessionBlock[] {
  const minutes = s.settings.sessionMinutes;
  const factor = s.settings.mode === "light" ? 0.7 : s.settings.mode === "intensive" ? 1.4 : 1;
  const [v, g, l, sp, r] = SPLITS[minutes].map((m) => Math.max(3, Math.round(m * factor)));
  const d = s.days[dayKey(now)];
  const words = (d?.wordsLearned ?? 0) + (d?.wordsReviewed ?? 0);
  const wordTarget = Math.round(v * 1.6);
  const weak = weaknesses(s, now).find((w) => w.status === "weak");
  const nl = nextLesson(s);
  const grammarTopic = weak?.topic ?? nl?.lesson?.grammarTopic;
  const grammarTarget = Math.round(g * 1.2);
  const level: Cefr = s.profile.level;
  const track =
    listeningTracks.find((t) => isLevelUnlocked(s, t.level) && !s.progress[`listening:${t.id}`]?.completedAt) ??
    listeningTracks.find((t) => t.level === level);
  const reading = readingTexts.find((t) => isLevelUnlocked(s, t.level) && !s.progress[`reading:${t.id}`]?.completedAt);
  const speakSec = (d?.speakingSeconds ?? 0) + (d?.conversationMessages ?? 0) * 20;
  const reviewsDone = (d?.reviewsDone ?? 0) + (d?.wordsReviewed ?? 0);
  const dueTotal = dueCards(s, now).length + dueItems(s, now).length;

  return [
    { id: "vocabulary", title: "Vocabulaire", minutes: v, href: "/vocabulary", detail: `${wordTarget} mots à apprendre ou réviser`, progress: Math.min(1, words / wordTarget), done: words >= wordTarget },
    {
      id: "grammar",
      title: "Grammaire",
      minutes: g,
      href: grammarTopic ? `/grammar/${grammarTopic}${weak ? "?focus=1" : ""}` : "/grammar",
      detail: weak ? `Point faible : ${weak.title}` : grammarTopic ? `Leçon en cours : ${getGrammar(grammarTopic)?.titleFr}` : "Choisissez un cours",
      progress: Math.min(1, (d?.grammarCorrect ?? 0) / grammarTarget),
      done: (d?.grammarCorrect ?? 0) >= grammarTarget,
    },
    {
      id: "listening",
      title: "Compréhension",
      minutes: l,
      href: track ? `/listening/${track.id}` : reading ? `/reading/${reading.id}` : "/listening",
      detail: track ? `Écoute : ${track.title}` : reading ? `Lecture : ${reading.title}` : "Écoute ou lecture au choix",
      progress: Math.min(1, ((d?.listeningDone ?? 0) + (d?.readingDone ?? 0)) / 1),
      done: (d?.listeningDone ?? 0) + (d?.readingDone ?? 0) >= 1,
    },
    { id: "speaking", title: "Expression orale", minutes: sp, href: "/speaking", detail: "Speaking Studio ou conversation IA", progress: Math.min(1, speakSec / (sp * 30)), done: speakSec >= sp * 30 },
    {
      id: "review",
      title: "Révision",
      minutes: r,
      href: "/review",
      detail: dueTotal ? `${dueTotal} élément${dueTotal > 1 ? "s" : ""} à revoir` : "Rien en attente — révision libre",
      progress: dueTotal === 0 ? 1 : Math.min(1, reviewsDone / (reviewsDone + dueTotal)),
      done: dueTotal === 0,
    },
  ];
}
