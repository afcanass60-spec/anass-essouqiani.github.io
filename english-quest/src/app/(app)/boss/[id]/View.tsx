"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getChapter } from "@/content";
import { useActiveTime, useStore } from "@/lib/store";
import { addXp, recordProgress, today } from "@/lib/engine/actions";
import { BOSS_PASS, bossHearts, bossItems, isBossUnlocked } from "@/lib/engine/progression";
import { XP } from "@/lib/engine/xp";
import { uid } from "@/lib/state";
import { AutoExercise } from "@/components/learn/Exercise";
import { Button, Card, Empty, LinkButton, Notice, Progress, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

const BOSS_EMBLEMS: Record<string, string> = { clock: "⏳", orb: "🔮", wave: "🌊", stamp: "🗂️", ghost: "👻", magnifier: "🔍", trumpet: "🎺", mask: "🎭", scroll: "📜", sphinx: "🦁" };

export default function View() {
  const { id } = useParams<{ id: string }>();
  const chapter = getChapter(id);
  const { state, act } = useStore();
  useActiveTime("exam");
  const [phase, setPhase] = useState<"intro" | "fight" | "won" | "lost">("intro");
  const [attemptSeed, setAttemptSeed] = useState(0);
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState(0);
  const [hits, setHits] = useState(0);
  const [shake, setShake] = useState(0);
  const [startedAt, setStartedAt] = useState(0);

  const items = useMemo(() => (chapter ? bossItems(chapter, 1000 + attemptSeed * 97) : []), [chapter, attemptSeed]);
  if (!chapter) return <Empty icon="alert" title="Boss introuvable" />;
  if (!state) return null;
  if (!isBossUnlocked(state, chapter))
    return (
      <Empty icon="lock" title={`${chapter.boss.name} vous attend`}>
        Terminez toutes les leçons du chapitre « {chapter.titleFr} » pour l&apos;affronter. <Link href="/map" className="text-primary underline">Parcours</Link>
      </Empty>
    );

  const allowed = bossHearts(items.length);
  const hearts = allowed + 1 - errors;
  const prev = state.progress[`boss:${chapter.id}`];

  function start() {
    setAttemptSeed((prev?.tries ?? 0) + Math.floor(Math.random() * 1000));
    setIndex(0);
    setErrors(0);
    setHits(0);
    setStartedAt(Date.now());
    setPhase("fight");
  }

  function finish(won: boolean, correct: number, total: number) {
    setPhase(won ? "won" : "lost");
    act((d, now) => {
      const first = !d.progress[`boss:${chapter!.id}`]?.completedAt;
      recordProgress(d, `boss:${chapter!.id}`, correct / total, now, won);
      d.exams.push({ id: uid(), examId: `boss:${chapter!.id}`, kind: "boss", level: chapter!.level, startedAt, finishedAt: now, passed: won, results: [{ skill: "grammar", score: correct, max: total, evaluated: true }] });
      if (!won) return 0;
      today(d, now).bossesWon += 1;
      return addXp(d, first ? XP.bossFirstWin : XP.bossRetake, now);
    });
  }

  function onAnswer(correct: boolean) {
    const nHits = hits + (correct ? 1 : 0);
    const nErr = errors + (correct ? 0 : 1);
    setHits(nHits);
    setErrors(nErr);
    if (!correct) setShake((s) => s + 1);
    if (nErr > allowed) return finish(false, nHits, index + 1);
    if (index + 1 >= items.length) return finish(true, nHits, items.length);
    setIndex(index + 1);
  }

  const emblem = BOSS_EMBLEMS[chapter.boss.avatar] ?? "⚔️";
  const bossHp = 1 - hits / Math.ceil(items.length * BOSS_PASS);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(40rem 15rem at 50% 0%, var(--red-soft), transparent)" }} aria-hidden />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <motion.div key={shake} animate={phase === "fight" && hits ? { scale: [1, 0.92, 1] } : {}} className="grid h-24 w-24 place-items-center rounded-3xl text-5xl shadow-2xl" style={{ background: "linear-gradient(135deg, var(--red), var(--violet))" }} aria-hidden>
            {emblem}
          </motion.div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-red">Boss · {chapter.level}</p>
            <h1 className="font-display text-3xl font-bold">{chapter.boss.name}</h1>
            <p className="text-muted">{chapter.boss.title}</p>
          </div>
          {phase === "fight" ? (
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold"><span className="w-16 text-left text-red">PV boss</span><Progress value={Math.max(0, bossHp)} tone="amber" label="Points de vie du boss" /></div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="w-16 text-left text-green">Vous</span>
                <div className="flex gap-1" aria-label={`${hearts} cœur(s) restant(s)`}>
                  {Array.from({ length: allowed + 1 }).map((_, i) => (
                    <Icon key={i} name="heart" size={20} className={i < hearts ? "fill-red text-red" : "text-faint"} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <AnimatePresence mode="wait">
        {phase === "intro" ? (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="space-y-4">
              <p className="italic text-muted">« {chapter.boss.lore} »</p>
              <ul className="space-y-1 text-sm">
                <li>• {items.length} questions exigeantes sur la grammaire et le vocabulaire du chapitre (QCM, textes à trous, transformations, corrections).</li>
                <li>• Vous disposez de {allowed + 1} cœur(s) : au-delà de {allowed} erreur(s), le combat est perdu.</li>
                <li>• Victoire = au moins {Math.round(BOSS_PASS * 100)} % de bonnes réponses. Elle débloque le chapitre suivant.</li>
              </ul>
              {prev ? <Notice tone={prev.completedAt ? "green" : "blue"}>Meilleur score : {Math.round(prev.best * 100)} % en {prev.tries} tentative(s){prev.completedAt ? " — boss déjà vaincu" : ""}.</Notice> : null}
              <div className="flex justify-end"><Button onClick={start} icon="sword" variant="danger" size="lg">Combattre</Button></div>
            </Card>
          </motion.div>
        ) : null}
        {phase === "fight" && items[index] ? (
          <motion.div key={`q${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className={cx(shake > 0 && "transition")}>
              <p className="mb-3 text-sm text-faint">Question {index + 1}/{items.length}</p>
              <AutoExercise item={items[index]} source="boss" onDone={(o) => onAnswer(o.correct)} seed={index} />
            </Card>
          </motion.div>
        ) : null}
        {phase === "won" ? (
          <motion.div key="won" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="space-y-4 text-center">
              <p className="text-5xl" aria-hidden>🏆</p>
              <h2 className="font-display text-2xl font-bold text-green">{chapter.boss.name} est vaincu !</h2>
              <p className="text-muted">{hits}/{items.length} bonnes réponses. Le chapitre est validé.</p>
              <div className="flex justify-center gap-2"><LinkButton href="/map" iconRight="arrowRight">Continuer l&apos;aventure</LinkButton></div>
            </Card>
          </motion.div>
        ) : null}
        {phase === "lost" ? (
          <motion.div key="lost" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="space-y-4 text-center">
              <p className="text-5xl" aria-hidden>💥</p>
              <h2 className="font-display text-2xl font-bold text-red">Défaite… pour cette fois</h2>
              <p className="text-muted">Vos erreurs ont été ajoutées à vos révisions. Retravaillez les points faibles puis revenez : les questions changent à chaque combat.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/review" variant="secondary" icon="repeat">Réviser</LinkButton>
                <Button onClick={start} variant="danger" icon="sword">Revanche</Button>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
