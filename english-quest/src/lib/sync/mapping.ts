import { LEVELS, type Cefr, type Skill } from "@/lib/types";
import type { Card, DayStats, LearnerState } from "@/lib/state";
import { createInitialState, emptyDay } from "@/lib/state";
import { getWord } from "@/content";
import { playerLevel } from "@/lib/engine/xp";
import { weekDays } from "@/lib/engine/quests";

/* =========================================================
   Correspondance état local ⇄ tables relationnelles Supabase
   (fonctions pures, testées unitairement).
   ========================================================= */

const iso = (ts?: number) => (ts ? new Date(ts).toISOString() : null);
const ms = (s?: string | null) => (s ? new Date(s).getTime() : undefined);

export interface Rows {
  profiles: Record<string, unknown>[];
  user_vocabulary: Record<string, unknown>[];
  user_progress: Record<string, unknown>[];
  exercise_attempts: Record<string, unknown>[];
  learning_sessions: Record<string, unknown>[];
  user_achievements: Record<string, unknown>[];
  user_quests: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  conversation_messages: Record<string, unknown>[];
  writing_submissions: Record<string, unknown>[];
  speaking_attempts: Record<string, unknown>[];
  exam_attempts: Record<string, unknown>[];
  exam_results: Record<string, unknown>[];
  error_history: Record<string, unknown>[];
  revision_schedule: Record<string, unknown>[];
}

/** Ordre d'écriture respectant les clés étrangères. */
export const TABLE_ORDER: (keyof Rows)[] = [
  "profiles",
  "user_vocabulary",
  "user_progress",
  "exercise_attempts",
  "learning_sessions",
  "user_achievements",
  "user_quests",
  "conversations",
  "conversation_messages",
  "writing_submissions",
  "speaking_attempts",
  "exam_attempts",
  "exam_results",
  "error_history",
  "revision_schedule",
];

export const CONFLICT_KEYS: Record<keyof Rows, string> = {
  profiles: "id",
  user_vocabulary: "user_id,word_key",
  user_progress: "user_id,progress_key",
  exercise_attempts: "id",
  learning_sessions: "user_id,day",
  user_achievements: "user_id,achievement_id",
  user_quests: "user_id,quest_key",
  conversations: "id",
  conversation_messages: "conversation_id,position",
  writing_submissions: "id",
  speaking_attempts: "id",
  exam_attempts: "id",
  exam_results: "attempt_id,skill",
  error_history: "id",
  revision_schedule: "user_id,item_id",
};

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Lignes à écrire depuis `since` (0 = tout). */
export function stateToRows(s: LearnerState, userId: string, since = 0, now = Date.now()): Rows {
  const u = { user_id: userId };
  const weeklyXp = weekDays(s, now).reduce((a, d) => a + d.xp, 0);
  const rows: Rows = {
    profiles: [
      {
        id: userId,
        display_name: s.profile.displayName.slice(0, 40) || "Apprenant",
        settings: s.settings,
        xp: s.xp,
        player_level: playerLevel(s.xp).level,
        streak_current: s.streak.current,
        streak_best: s.streak.best,
        streak_last_day: s.streak.lastDay ?? null,
        current_level: s.profile.level,
        placement: s.profile.placement ?? null,
        level_validations: s.profile.validations,
        leaderboard_opt_in: s.settings.leaderboardOptIn,
        weekly_xp: weeklyXp,
      },
    ],
    user_vocabulary: Object.values(s.cards)
      .filter((c) => c.updatedAt > since)
      .map((c) => ({
        ...u,
        word_key: c.wordId,
        vocabulary_id: getWord(c.wordId) ? c.wordId : null,
        custom_word: c.custom ?? null,
        ease: c.ease,
        interval_days: c.interval,
        reps: c.reps,
        lapses: c.lapses,
        due_at: iso(c.due),
        last_review_at: iso(c.lastReview),
        learned_at: iso(c.learnedAt),
        counters: { recognition: c.recognition, recall: c.recall, context: c.context, use: c.use },
        added_at: iso(c.addedAt),
        updated_at: iso(c.updatedAt),
      })),
    user_progress: Object.entries(s.progress)
      .filter(([, p]) => p.updatedAt > since)
      .map(([k, p]) => ({ ...u, progress_key: k, best: p.best, tries: p.tries, completed_at: iso(p.completedAt), data: p.data ?? null, updated_at: iso(p.updatedAt) })),
    exercise_attempts: s.attempts
      .filter((a) => a.ts > since && isUuid(a.id))
      .map((a) => ({ id: a.id, ...u, item_id: a.itemId, skill: a.skill, level_id: a.level, topic: a.topic ?? null, objective: a.objective ?? null, correct: a.correct, source: a.source, created_at: iso(a.ts) })),
    learning_sessions: Object.entries(s.days)
      .filter(([, d]) => d.updatedAt > since)
      .map(([day, d]) => {
        const { xp, seconds, updatedAt, ...stats } = d;
        return { ...u, day, xp, seconds, stats, updated_at: iso(updatedAt) };
      }),
    user_achievements: Object.entries(s.achievements)
      .filter(([, ts]) => ts > since)
      .map(([id, ts]) => ({ ...u, achievement_id: id, unlocked_at: iso(ts) })),
    user_quests: Object.entries(s.quests)
      .filter(([, ts]) => ts > since)
      .map(([key, ts]) => ({ ...u, quest_key: key, claimed_at: iso(ts) })),
    conversations: [],
    conversation_messages: [],
    writing_submissions: s.writing
      .filter((w) => w.ts > since && isUuid(w.id))
      .map((w) => ({ id: w.id, ...u, task_id: w.taskId, level_id: w.level, text: w.text, word_count: w.wordCount, feedback: w.feedback ?? null, created_at: iso(w.ts) })),
    speaking_attempts: s.speaking
      .filter((a) => a.ts > since && isUuid(a.id))
      .map((a) => ({
        id: a.id,
        ...u,
        task_id: a.taskId,
        level_id: a.level,
        transcript: a.transcript,
        duration_sec: a.durationSec,
        wpm: a.wpm,
        accuracy: a.accuracy ?? null,
        feedback: a.feedback ?? null,
        created_at: iso(a.ts),
      })),
    exam_attempts: [],
    exam_results: [],
    error_history: s.errors
      .filter((e) => e.ts > since && isUuid(e.id))
      .map((e) => ({
        id: e.id,
        ...u,
        skill: e.skill,
        topic: e.topic ?? null,
        item_id: e.itemId ?? null,
        original: e.original?.slice(0, 2000) ?? null,
        corrected: e.corrected?.slice(0, 2000) ?? null,
        explanation: e.explanation?.slice(0, 4000) ?? null,
        source: e.source,
        created_at: iso(e.ts),
      })),
    revision_schedule: Object.entries(s.revision)
      .filter(([, r]) => r.updatedAt > since)
      .map(([item, r]) => ({ ...u, item_id: item, due_at: iso(r.due), interval_days: r.interval, streak: r.streak, updated_at: iso(r.updatedAt) })),
  };

  for (const c of s.conversations) {
    if (c.updatedAt <= since || !isUuid(c.id)) continue;
    rows.conversations.push({ id: c.id, ...u, persona: c.persona, mode: c.mode, started_at: iso(c.startedAt), ended_at: iso(c.endedAt), report: c.report ?? null, updated_at: iso(c.updatedAt) });
    c.messages.forEach((m, i) =>
      rows.conversation_messages.push({ conversation_id: c.id, ...u, position: i, role: m.role, content: m.content.slice(0, 8000), corrections: m.corrections ?? null, created_at: iso(m.ts) }),
    );
  }
  for (const e of s.exams) {
    if (e.finishedAt <= since || !isUuid(e.id)) continue;
    rows.exam_attempts.push({ id: e.id, ...u, exam_id: e.examId, kind: e.kind, level_id: e.level, started_at: iso(e.startedAt), finished_at: iso(e.finishedAt), passed: e.passed ?? null });
    for (const r of e.results)
      rows.exam_results.push({ attempt_id: e.id, ...u, skill: r.skill, score: r.score, max_score: r.max, rating: r.rating ?? null, evaluated: r.evaluated });
  }
  return rows;
}

type Row = Record<string, unknown>;
const str = (r: Row, k: string) => (r[k] as string | null) ?? undefined;

/** Reconstruit un état à partir des lignes lues (pull). */
export function rowsToState(rows: Partial<Rows>, now = Date.now()): LearnerState {
  const s = createInitialState(now);
  const p = rows.profiles?.[0];
  if (p) {
    s.profile.displayName = (p.display_name as string) ?? s.profile.displayName;
    s.settings = { ...s.settings, ...((p.settings as object) ?? {}) };
    s.streak = { current: (p.streak_current as number) ?? 0, best: (p.streak_best as number) ?? 0, lastDay: str(p, "streak_last_day")?.slice(0, 10) };
    if (LEVELS.includes(p.current_level as Cefr)) s.profile.level = p.current_level as Cefr;
    s.profile.placement = (p.placement as LearnerState["profile"]["placement"]) ?? undefined;
    s.profile.validations = (p.level_validations as LearnerState["profile"]["validations"]) ?? {};
    s.updatedAt = ms(str(p, "updated_at")) ?? now;
    s.createdAt = ms(str(p, "created_at")) ?? now;
  }
  for (const r of rows.user_vocabulary ?? []) {
    const counters = (r.counters as Partial<Pick<Card, "recognition" | "recall" | "context" | "use">>) ?? {};
    const zero = { seen: 0, correct: 0 };
    s.cards[r.word_key as string] = {
      wordId: r.word_key as string,
      ease: r.ease as number,
      interval: r.interval_days as number,
      reps: r.reps as number,
      lapses: r.lapses as number,
      due: ms(str(r, "due_at")) ?? now,
      lastReview: ms(str(r, "last_review_at")),
      learnedAt: ms(str(r, "learned_at")),
      addedAt: ms(str(r, "added_at")) ?? now,
      updatedAt: ms(str(r, "updated_at")) ?? now,
      recognition: counters.recognition ?? zero,
      recall: counters.recall ?? zero,
      context: counters.context ?? zero,
      use: counters.use ?? zero,
      custom: (r.custom_word as Card["custom"]) ?? undefined,
    };
  }
  for (const r of rows.user_progress ?? [])
    s.progress[r.progress_key as string] = {
      best: r.best as number,
      tries: r.tries as number,
      completedAt: ms(str(r, "completed_at")),
      updatedAt: ms(str(r, "updated_at")) ?? now,
      data: (r.data as Record<string, number | string | boolean>) ?? undefined,
    };
  s.attempts = (rows.exercise_attempts ?? [])
    .map((r) => ({
      id: r.id as string,
      itemId: r.item_id as string,
      skill: r.skill as Skill,
      level: r.level_id as Cefr,
      topic: str(r, "topic"),
      objective: str(r, "objective"),
      correct: !!r.correct,
      source: r.source as LearnerState["attempts"][number]["source"],
      ts: ms(str(r, "created_at")) ?? now,
    }))
    .sort((a, b) => a.ts - b.ts);
  // Les items réussis ont déjà rapporté leur XP.
  for (const a of s.attempts) if (a.correct && a.source !== "placement" && !s.itemXp[a.itemId]) s.itemXp[a.itemId] = a.ts;
  for (const r of rows.learning_sessions ?? []) {
    const base = emptyDay(now);
    s.days[String(r.day).slice(0, 10)] = { ...base, ...((r.stats as Partial<DayStats>) ?? {}), xp: r.xp as number, seconds: (r.seconds as DayStats["seconds"]) ?? {}, updatedAt: ms(str(r, "updated_at")) ?? now };
  }
  s.xp = Object.values(s.days).reduce((a, d) => a + d.xp, 0);
  for (const r of rows.user_achievements ?? []) s.achievements[r.achievement_id as string] = ms(str(r, "unlocked_at")) ?? now;
  for (const r of rows.user_quests ?? []) s.quests[r.quest_key as string] = ms(str(r, "claimed_at")) ?? now;
  const msgs = new Map<string, Row[]>();
  for (const m of rows.conversation_messages ?? []) {
    const k = m.conversation_id as string;
    if (!msgs.has(k)) msgs.set(k, []);
    msgs.get(k)!.push(m);
  }
  s.conversations = (rows.conversations ?? []).map((c) => ({
    id: c.id as string,
    persona: c.persona as LearnerState["conversations"][number]["persona"],
    mode: c.mode as LearnerState["conversations"][number]["mode"],
    startedAt: ms(str(c, "started_at")) ?? now,
    endedAt: ms(str(c, "ended_at")),
    updatedAt: ms(str(c, "updated_at")) ?? now,
    report: (c.report as LearnerState["conversations"][number]["report"]) ?? undefined,
    messages: (msgs.get(c.id as string) ?? [])
      .sort((a, b) => (a.position as number) - (b.position as number))
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content as string,
        corrections: (m.corrections as LearnerState["conversations"][number]["messages"][number]["corrections"]) ?? undefined,
        ts: ms(str(m, "created_at")) ?? now,
      })),
  }));
  s.writing = (rows.writing_submissions ?? []).map((w) => ({
    id: w.id as string,
    taskId: w.task_id as string,
    level: w.level_id as Cefr,
    ts: ms(str(w, "created_at")) ?? now,
    text: w.text as string,
    wordCount: w.word_count as number,
    feedback: (w.feedback as LearnerState["writing"][number]["feedback"]) ?? undefined,
  }));
  s.speaking = (rows.speaking_attempts ?? []).map((a) => ({
    id: a.id as string,
    taskId: a.task_id as string,
    level: a.level_id as Cefr,
    ts: ms(str(a, "created_at")) ?? now,
    transcript: a.transcript as string,
    durationSec: a.duration_sec as number,
    wpm: a.wpm as number,
    accuracy: (a.accuracy as number | null) ?? undefined,
    feedback: (a.feedback as LearnerState["speaking"][number]["feedback"]) ?? undefined,
  }));
  const results = new Map<string, Row[]>();
  for (const r of rows.exam_results ?? []) {
    const k = r.attempt_id as string;
    if (!results.has(k)) results.set(k, []);
    results.get(k)!.push(r);
  }
  s.exams = (rows.exam_attempts ?? []).map((e) => ({
    id: e.id as string,
    examId: e.exam_id as string,
    kind: e.kind as "mock" | "level" | "boss",
    level: e.level_id as Cefr,
    startedAt: ms(str(e, "started_at")) ?? now,
    finishedAt: ms(str(e, "finished_at")) ?? now,
    passed: (e.passed as boolean | null) ?? undefined,
    results: (results.get(e.id as string) ?? []).map((r) => ({
      skill: r.skill as Skill,
      score: r.score as number,
      max: r.max_score as number,
      rating: (r.rating as number | null) ?? undefined,
      evaluated: !!r.evaluated,
    })),
  }));
  s.errors = (rows.error_history ?? [])
    .map((e) => ({
      id: e.id as string,
      ts: ms(str(e, "created_at")) ?? now,
      skill: e.skill as Skill,
      topic: str(e, "topic"),
      itemId: str(e, "item_id"),
      original: str(e, "original"),
      corrected: str(e, "corrected"),
      explanation: str(e, "explanation"),
      source: e.source as LearnerState["errors"][number]["source"],
    }))
    .sort((a, b) => a.ts - b.ts);
  for (const r of rows.revision_schedule ?? [])
    s.revision[r.item_id as string] = { due: ms(str(r, "due_at")) ?? now, interval: r.interval_days as number, streak: r.streak as number, updatedAt: ms(str(r, "updated_at")) ?? now };
  return s;
}
