"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LEVELS, type Cefr } from "@/lib/types";
import { useStore } from "@/lib/store";
import { recordAttempt, validateLevel } from "@/lib/engine/actions";
import { nextPlacementItem, placementProgress, scorePlacement, PLACEMENT_SKILLS, type Answers } from "@/lib/engine/placement";
import { placementClips, READING_PASSAGES } from "@/content/placement";
import { levelIndex } from "@/content";
import type { PlacementResult } from "@/lib/state";
import { AutoExercise } from "@/components/learn/Exercise";
import { SpeakButton } from "@/components/learn/shared";
import { isAuto } from "@/lib/engine/answer";
import { SKILL_ICONS, SKILL_LABELS } from "@/lib/format";
import { Button, Card, LevelPill, Notice, PageHeader, Progress } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export default function PlacementPage() {
  const { state, act } = useStore();
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "test" | "result">("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<PlacementResult | null>(null);
  const entry = useMemo(() => (phase === "test" ? nextPlacementItem(answers) : null), [answers, phase]);
  const prog = placementProgress(answers);

  function answer(id: string, correct: boolean) {
    const next = { ...answers, [id]: correct };
    setAnswers(next);
    if (!nextPlacementItem(next)) {
      const r = scorePlacement(next);
      setResult(r);
      setPhase("result");
      act((d, now) => {
        d.profile.placement = r;
        // Les niveaux inférieurs au niveau de départ sont considérés comme validés par le test.
        for (const l of LEVELS) {
          if (levelIndex(l) < levelIndex(r.startLevel)) validateLevel(d, l, LEVELS[levelIndex(l) + 1], "placement", false, now);
        }
        if (levelIndex(r.startLevel) > levelIndex(d.profile.level)) d.profile.level = r.startLevel;
      });
    }
  }

  if (!state) return null;

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader icon="compass" kicker="Étape 1" title="Test de positionnement" subtitle="Un test adaptatif : les questions deviennent plus difficiles tant que vous réussissez, et chaque compétence s'arrête dès que vous atteignez votre limite." />
        <Card className="space-y-4">
          <ul className="grid gap-3 sm:grid-cols-2">
            {PLACEMENT_SKILLS.map((s) => (
              <li key={s} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                <Icon name={SKILL_ICONS[s]} className="text-primary" />
                <span className="font-medium">{SKILL_LABELS[s]}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            Durée : 10 à 20 minutes. Répondez sans aide : le but est de mesurer votre niveau réel. L&apos;expression orale et écrite seront évaluées dans le Speaking Studio et le Writing Workshop.
          </p>
          {state.profile.placement ? (
            <Notice tone="blue" title="Vous avez déjà passé ce test">
              Résultat précédent : {state.profile.placement.overall}. Repasser le test peut débloquer des niveaux supérieurs, mais ne vous fera jamais perdre de niveau.
            </Notice>
          ) : null}
          <Notice tone="amber" icon="volume" title="Activez le son">La partie écoute utilise la synthèse vocale de votre navigateur.</Notice>
          <div className="flex justify-end">
            <Button onClick={() => setPhase("test")} iconRight="arrowRight" size="lg">
              Commencer le test
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader icon="trophy" title="Votre profil de niveau" subtitle="Résultat indicatif d'un test d'entraînement — ce n'est pas une certification officielle." />
        <Card className="space-y-5 text-center">
          <p className="text-muted">Niveau global estimé</p>
          <p className="font-display text-5xl font-bold text-gradient">{result.overall}</p>
          <div className="grid gap-3 sm:grid-cols-2 text-left">
            {PLACEMENT_SKILLS.map((s) => (
              <div key={s} className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
                <span className="flex items-center gap-2"><Icon name={SKILL_ICONS[s]} size={18} className="text-muted" />{SKILL_LABELS[s]}</span>
                <LevelPill level={result.skills[s] ?? "A2"} />
              </div>
            ))}
          </div>
          {result.overall === "A2" ? (
            <Notice tone="amber" title="Niveau inférieur à B1 détecté">
              Votre parcours démarre en B1 avec les cours de consolidation (temps, present perfect). Prenez le temps de faire les exercices faciles et les révisions quotidiennes.
            </Notice>
          ) : (
            <Notice tone="green" title={`Parcours débloqué jusqu'au niveau ${result.startLevel}`}>
              {levelIndex(result.startLevel) > 0 ? "Les niveaux inférieurs restent accessibles pour réviser. " : ""}Pour passer au niveau suivant, il faudra vaincre les boss du niveau et réussir son examen de validation.
            </Notice>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => router.push("/dashboard")} iconRight="arrowRight">Voir mon tableau de bord</Button>
            <Button variant="secondary" onClick={() => router.push("/map")} icon="map">Carte du monde</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!entry) return null;
  const { item } = entry;
  const clip = entry.clip ? placementClips.find((c) => c.id === entry.clip) : null;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Progress value={prog.answered / prog.total} tone="grad" label="Progression du test" />
        <span className="shrink-0 text-sm text-muted">{prog.answered} réponses</span>
      </div>
      <div className="flex items-center gap-2">
        <Icon name={SKILL_ICONS[item.skill]} className="text-primary" />
        <span className="font-semibold">{SKILL_LABELS[item.skill]}</span>
        <LevelPill level={item.level as Cefr} />
      </div>
      <Card className="space-y-5">
        {entry.passage ? (
          <blockquote className="rounded-xl border-l-4 border-primary bg-surface-2 p-4 leading-relaxed" lang="en">
            {READING_PASSAGES[entry.passage]}
          </blockquote>
        ) : null}
        {clip ? (
          <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
            <SpeakButton text={clip.text} lang={clip.accent} rate={0.95} label="Écouter l'extrait" />
            <p className="text-sm text-muted">Écoutez l&apos;extrait ({clip.accent === "en-GB" ? "accent britannique" : "accent américain"}). Vous pouvez le réécouter avant de répondre.</p>
          </div>
        ) : null}
        {isAuto(item) ? (
          <AutoExercise
            key={item.id}
            item={item}
            source="placement"
            revealAnswer={false}
            record={false}
            onDone={(o) => {
              act((d, now) => recordAttempt(d, item, o.correct, "placement", now), { silent: true });
              answer(item.id, o.correct);
            }}
          />
        ) : null}
      </Card>
    </div>
  );
}
