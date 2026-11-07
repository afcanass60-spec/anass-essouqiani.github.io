"use client";

import { useState } from "react";
import { LEVELS } from "@/lib/types";
import { useStore } from "@/lib/store";
import { ACHIEVEMENTS } from "@/lib/engine/achievements";
import { playerLevel, titleFor } from "@/lib/engine/xp";
import { currentStreak } from "@/lib/engine/actions";
import { formatDate } from "@/lib/format";
import { supabaseConfigured } from "@/lib/supabase/client";
import { Button, Card, LevelPill, LinkButton, Notice, PageHeader, Pill, Progress, cx } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export default function ProfilePage() {
  const { state, act, user, signOut } = useStore();
  const [name, setName] = useState(state?.profile.displayName ?? "");
  if (!state) return null;
  const lvl = playerLevel(state.xp);
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;

  return (
    <div className="space-y-6">
      <PageHeader icon="user" title="Profil" />
      <Card className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-hero font-display text-4xl font-bold text-white">{(state.profile.displayName[0] ?? "?").toUpperCase()}</div>
        <div className="min-w-0 flex-1 space-y-3">
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const n = name.trim().slice(0, 40); if (n) act((d) => void (d.profile.displayName = n), { silent: true }); }}>
            <label className="sr-only" htmlFor="display-name">Pseudo</label>
            <input id="display-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 font-display text-lg font-bold outline-none focus:border-primary" />
            <Button size="sm" type="submit" variant="secondary">Enregistrer</Button>
          </form>
          <p className="text-muted">{titleFor(lvl.level)} · niveau de joueur {lvl.level} · {state.xp.toLocaleString("fr-FR")} XP · série {currentStreak(state, Date.now())} j (record {state.streak.best} j)</p>
          <Progress value={lvl.progress} tone="grad" label="Progression vers le niveau suivant" />
          <p className="text-sm text-faint">
            {supabaseConfigured ? (user ? <>Connecté : {user.email}</> : <>Non connecté — progression enregistrée sur cet appareil uniquement.</>) : <>Mode local : progression enregistrée dans ce navigateur.</>} Membre depuis le {formatDate(state.createdAt)}.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {supabaseConfigured && !user ? <LinkButton href="/login" icon="user">Se connecter</LinkButton> : null}
          {user ? <Button variant="secondary" icon="logout" onClick={() => void signOut()}>Se déconnecter</Button> : null}
          <LinkButton href="/settings" variant="ghost" icon="settings">Paramètres</LinkButton>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">Niveaux CECRL</h2>
        <ol className="grid gap-3 sm:grid-cols-5">
          {LEVELS.map((l) => {
            const v = state.profile.validations[l];
            const current = state.profile.level === l;
            return (
              <li key={l} className={cx("rounded-2xl border p-4 text-center", v ? "border-green/40 bg-green-soft" : current ? "border-primary/40 bg-primary-soft" : "border-line")}>
                <LevelPill level={l} />
                <p className="mt-2 text-sm font-semibold">{v ? "Validé" : current ? "En cours" : LEVELS.indexOf(l) < LEVELS.indexOf(state.profile.level) ? "Accessible" : "Verrouillé"}</p>
                {v ? <p className="text-xs text-muted">{v.source === "placement" ? "par le test" : formatDate(v.ts)}{v.source === "exam" && !v.productiveVerified ? " · productions non vérifiées" : ""}</p> : null}
              </li>
            );
          })}
        </ol>
        {state.profile.placement ? <Notice className="mt-4" tone="violet" icon="compass" title={`Test de positionnement : ${state.profile.placement.overall}`}>Passé le {formatDate(state.profile.placement.ts)}.</Notice> : <Notice className="mt-4" tone="violet" icon="compass" title="Test de positionnement non passé"><LinkButton href="/placement" size="sm" className="mt-2">Passer le test</LinkButton></Notice>}
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center justify-between font-display text-lg font-bold">Badges <Pill tone="violet">{unlocked}/{ACHIEVEMENTS.length}</Pill></h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const ts = state.achievements[a.id];
            return (
              <li key={a.id} className={cx("flex items-center gap-3 rounded-2xl border p-3", ts ? "border-violet/40 bg-violet-soft" : "border-line opacity-60")}>
                <span className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", ts ? "bg-hero text-white" : "bg-surface-2 text-faint")}><Icon name={ts ? a.icon : "lock"} /></span>
                <span className="min-w-0">
                  <span className="block font-semibold">{a.name}</span>
                  <span className="block text-xs text-muted">{a.description}</span>
                  {ts ? <span className="block text-xs text-violet">Obtenu le {formatDate(ts)}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
