"use client";

import Link from "next/link";
import { useState } from "react";
import type { VocabEntry } from "@/lib/types";
import { speak, stopSpeaking, ttsSupported } from "@/lib/audio";
import { useStore } from "@/lib/store";
import { useAiStatus } from "@/lib/useAi";
import { THEME_LABELS } from "@/content";
import { Icon } from "@/components/ui/Icon";
import { LevelPill, Notice, Pill, cx } from "@/components/ui/primitives";

export function SpeakButton({ text, lang, gender, rate, label = "Écouter", size = "md", className }: { text: string; lang?: "en-GB" | "en-US"; gender?: "f" | "m"; rate?: number; label?: string; size?: "sm" | "md"; className?: string }) {
  const { state } = useStore();
  const [playing, setPlaying] = useState(false);
  if (!ttsSupported()) return null;
  const accent = lang ?? state?.settings.accent ?? "en-GB";
  return (
    <button
      type="button"
      onClick={() => {
        if (playing) {
          stopSpeaking();
          setPlaying(false);
          return;
        }
        stopSpeaking();
        setPlaying(true);
        speak(text, { lang: accent, gender, rate: rate ?? state?.settings.speechRate ?? 1, onEnd: () => setPlaying(false) });
      }}
      aria-label={`${label} : ${text}`}
      title={label}
      className={cx("inline-grid shrink-0 place-items-center rounded-full bg-primary-soft text-primary transition hover:bg-primary hover:text-white", size === "sm" ? "h-8 w-8" : "h-10 w-10", className)}
    >
      <Icon name={playing ? "stop" : "volume"} size={size === "sm" ? 15 : 18} />
    </button>
  );
}

export function WordDetails({ w, compact }: { w: VocabEntry; compact?: boolean }) {
  const { state } = useStore();
  const showFr = state?.settings.showTranslations ?? true;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl font-bold" lang="en">
              {w.word}
            </h3>
            <LevelPill level={w.level} />
            <Pill tone="gray">{w.pos}</Pill>
            {w.kind !== "word" ? <Pill tone="violet">{{ phrasal: "phrasal verb", idiom: "idiome", collocation: "collocation", word: "" }[w.kind]}</Pill> : null}
          </div>
          <p className="mt-1 font-mono text-sm text-muted">
            🇬🇧 {w.ipa}
            {w.ipaUs ? <span className="ml-3">🇺🇸 {w.ipaUs}</span> : null}
          </p>
        </div>
        <div className="flex gap-1.5">
          <SpeakButton text={w.word} lang="en-GB" label="Écouter (UK)" size="sm" />
          <SpeakButton text={w.word} lang="en-US" label="Écouter (US)" size="sm" className="bg-amber-soft text-amber hover:bg-amber" />
        </div>
      </div>
      <p lang="en">{w.defEn}</p>
      {showFr ? <p className="text-muted">🇫🇷 {w.fr}</p> : null}
      <div className="flex items-start gap-2 rounded-xl bg-surface-2 p-3">
        <SpeakButton text={w.example} size="sm" label="Écouter l'exemple" />
        <p className="italic" lang="en">
          “{w.example}”
        </p>
      </div>
      {!compact ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {w.synonyms?.length ? (
            <p>
              <span className="font-semibold text-green">Synonymes : </span>
              <span lang="en">{w.synonyms.join(", ")}</span>
            </p>
          ) : null}
          {w.antonyms?.length ? (
            <p>
              <span className="font-semibold text-red">Antonymes : </span>
              <span lang="en">{w.antonyms.join(", ")}</span>
            </p>
          ) : null}
          {w.collocations?.length ? (
            <p className="sm:col-span-2">
              <span className="font-semibold text-violet">Collocations : </span>
              <span lang="en">{w.collocations.join(" · ")}</span>
            </p>
          ) : null}
          {w.ukUs ? (
            <p className="sm:col-span-2">
              <span className="font-semibold text-amber">UK / US : </span>
              {w.ukUs}
            </p>
          ) : null}
          <p className="text-faint sm:col-span-2">Thème : {THEME_LABELS[w.theme]}</p>
        </div>
      ) : null}
    </div>
  );
}

export function AiNotice({ what = "Cette fonctionnalité" }: { what?: string }) {
  const ai = useAiStatus();
  const { user } = useStore();
  if (ai.loading) return null;
  if (!ai.configured)
    return (
      <Notice tone="amber" icon="sparkles" title="IA non connectée">
        {what} nécessite un fournisseur IA. Ajoutez une clé (<code>ANTHROPIC_API_KEY</code>) ou un fournisseur compatible (Ollama gratuit en local) dans les variables d&apos;environnement du serveur — voir le README. Aucune réponse n&apos;est simulée.
      </Notice>
    );
  if (ai.requiresAuth && !user)
    return (
      <Notice tone="blue" icon="user" title="Connexion requise">
        {what} est réservée aux comptes connectés. <Link href="/login" className="font-semibold text-primary underline">Se connecter</Link>
      </Notice>
    );
  return null;
}

export function useAiUsable() {
  const ai = useAiStatus();
  const { user } = useStore();
  return { ...ai, usable: ai.configured && (!ai.requiresAuth || !!user) };
}
