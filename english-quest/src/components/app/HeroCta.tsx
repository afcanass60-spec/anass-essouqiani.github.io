"use client";

import { useStore } from "@/lib/store";
import { LinkButton } from "@/components/ui/primitives";

export function HeroCta() {
  const { state } = useStore();
  const started = !!state && (state.xp > 0 || !!state.profile.placement);
  return (
    <div className="flex flex-wrap gap-3">
      {started ? (
        <LinkButton href="/dashboard" size="lg" iconRight="arrowRight">Continuer ma quête</LinkButton>
      ) : (
        <LinkButton href="/placement" size="lg" iconRight="arrowRight">Commencer gratuitement</LinkButton>
      )}
      <LinkButton href="/map" size="lg" variant="secondary" icon="map">Explorer la carte</LinkButton>
    </div>
  );
}
