"use client";

import Link from "next/link";
import { LEVELS } from "@/lib/types";
import { useStore } from "@/lib/store";
import { chaptersOf, getGrammar, LEVEL_INFO } from "@/content";
import { bossDefeated, isBossUnlocked, isChapterUnlocked, isLessonUnlocked, isLevelExamUnlocked, isLevelUnlocked, lessonDone } from "@/lib/engine/progression";
import { levelObjectives } from "@/lib/engine/mastery";
import { Icon } from "@/components/ui/Icon";
import { LevelPill, Pill, Progress, cx } from "@/components/ui/primitives";

/** Parcours complet B1 → C1 : niveaux, chapitres, leçons, boss et examens. */
export function LearningPath() {
  const { state } = useStore();
  if (!state) return null;
  return (
    <ol className="space-y-8">
      {LEVELS.map((level) => {
        const unlocked = isLevelUnlocked(state, level);
        const validation = state.profile.validations[level];
        const obj = levelObjectives(state, level);
        const mastered = obj.filter((o) => o.status === "mastered").length;
        return (
          <li key={level} className={cx("card overflow-hidden", !unlocked && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-5" style={{ background: `linear-gradient(90deg, ${LEVEL_INFO[level].color}22, transparent)` }}>
              <span className="grid h-12 w-12 place-items-center rounded-2xl font-display text-lg font-bold text-white" style={{ background: LEVEL_INFO[level].color }}>
                {level}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-xl font-bold">{LEVEL_INFO[level].nameFr}</h2>
                <p className="text-sm text-muted">{LEVEL_INFO[level].goalFr}</p>
              </div>
              <div className="flex items-center gap-2">
                {validation ? <Pill tone="green" icon="check">{validation.source === "placement" ? "Validé (test)" : "Validé"}</Pill> : unlocked ? <Pill tone="blue">En cours</Pill> : <Pill tone="gray" icon="lock">Verrouillé</Pill>}
                <Pill tone="violet">{mastered}/{obj.length} objectifs</Pill>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {chaptersOf(level).map((c, ci) => {
                const cu = isChapterUnlocked(state, c);
                const done = c.lessons.filter((l) => lessonDone(state, l.id)).length;
                const beaten = bossDefeated(state, c.id);
                return (
                  <div key={c.id} className={cx("rounded-2xl border border-line bg-surface-2/60 p-4", !cu && "opacity-60")}>
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-faint">Chapitre {ci + 1}</p>
                        <h3 className="font-semibold">{c.titleFr}</h3>
                      </div>
                      {!cu ? <Icon name="lock" className="text-faint" /> : null}
                    </div>
                    <Progress value={(done + (beaten ? 1 : 0)) / (c.lessons.length + 1)} height={6} label={`Progression du chapitre ${c.titleFr}`} />
                    <ul className="mt-3 space-y-1.5">
                      {c.lessons.map((l) => {
                        const lu = isLessonUnlocked(state, c, l.id);
                        const ld = lessonDone(state, l.id);
                        const topic = l.grammarTopic ? getGrammar(l.grammarTopic) : null;
                        return (
                          <li key={l.id}>
                            {lu ? (
                              <Link href={`/lesson/${l.id}`} className="flex items-center gap-2.5 rounded-lg p-2 text-sm transition hover:bg-surface">
                                <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full", ld ? "bg-green text-[#04130b]" : "bg-primary-soft text-primary")}>
                                  <Icon name={ld ? "check" : "play"} size={14} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium">{l.titleFr}</span>
                                  {topic ? <span className="block truncate text-xs text-faint">{topic.titleFr}</span> : null}
                                </span>
                              </Link>
                            ) : (
                              <span className="flex items-center gap-2.5 p-2 text-sm text-faint">
                                <span className="grid h-7 w-7 place-items-center rounded-full bg-surface"><Icon name="lock" size={13} /></span>
                                {l.titleFr}
                              </span>
                            )}
                          </li>
                        );
                      })}
                      <li>
                        {isBossUnlocked(state, c) ? (
                          <Link href={`/boss/${c.id}`} className={cx("flex items-center gap-2.5 rounded-lg p-2 text-sm font-semibold transition", beaten ? "text-green hover:bg-surface" : "bg-red-soft text-red hover:brightness-110")}>
                            <span className={cx("grid h-7 w-7 place-items-center rounded-full", beaten ? "bg-green text-[#04130b]" : "bg-red text-white")}>
                              <Icon name={beaten ? "trophy" : "sword"} size={14} />
                            </span>
                            Boss : {c.boss.name} {beaten ? "— vaincu" : ""}
                          </Link>
                        ) : (
                          <span className="flex items-center gap-2.5 p-2 text-sm text-faint">
                            <span className="grid h-7 w-7 place-items-center rounded-full bg-surface"><Icon name="sword" size={13} /></span>
                            Boss : {c.boss.name}
                          </span>
                        )}
                      </li>
                    </ul>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
              <span className="flex items-center gap-2 text-sm text-muted"><Icon name="trophy" size={16} />Examen de validation {level}</span>
              {isLevelExamUnlocked(state, level) || validation ? (
                <Link href={`/exam/level/${encodeURIComponent(level)}`} className="text-sm font-semibold text-primary hover:underline">
                  {validation?.source === "exam" ? "Repasser l'examen" : "Passer l'examen"} →
                </Link>
              ) : (
                <span className="flex items-center gap-1 text-xs text-faint"><Icon name="lock" size={13} />Vaincre les boss du niveau</span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function LevelBadge({ level }: { level: string }) {
  return <LevelPill level={level} />;
}
