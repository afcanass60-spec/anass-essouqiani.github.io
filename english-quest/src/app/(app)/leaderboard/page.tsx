"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { Card, Empty, LevelPill, Notice, PageHeader, Spinner, cx } from "@/components/ui/primitives";

interface Row { display_name: string; xp: number; weekly_xp: number; player_level: number; current_level: string; is_me: boolean }

export default function LeaderboardPage() {
  const { state, act, user, syncNow } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const optIn = state?.settings.leaderboardOptIn ?? false;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !user) return;
    let alive = true;
    sb.rpc("leaderboard", { limit_count: 50 }).then(({ data, error: e }) => {
      if (!alive) return;
      if (e) setError(e.message);
      else setRows((data ?? []) as Row[]);
    });
    return () => { alive = false; };
  }, [user, optIn]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon="crown" title="Classement" subtitle="Facultatif : seuls les apprenants qui l'ont choisi y apparaissent, avec leur pseudo et leur XP de la semaine." />
      {!supabaseConfigured ? (
        <Notice tone="amber" title="Classement indisponible en mode local">Le classement nécessite un compte (Supabase configuré). Votre progression reste privée sur cet appareil.</Notice>
      ) : !user ? (
        <Notice tone="blue" title="Connectez-vous pour voir le classement"><Link href="/login" className="font-semibold text-primary underline">Se connecter</Link></Notice>
      ) : (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Apparaître dans le classement</p>
              <p className="text-sm text-muted">{optIn ? "Votre pseudo et votre XP sont visibles par les autres apprenants." : "Votre profil est masqué."}</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={optIn} onChange={(e) => { act((d) => void (d.settings.leaderboardOptIn = e.target.checked), { silent: true }); setTimeout(() => void syncNow(), 50); }} className="h-5 w-5 accent-[var(--primary)]" />
              {optIn ? "Visible" : "Masqué"}
            </label>
          </Card>
          {error ? <Notice tone="red" title="Erreur">{error}</Notice> : rows === null ? <div className="flex justify-center py-10"><Spinner /></div> : rows.length ? (
            <Card className="p-0">
              <ol>
                {rows.map((r, i) => (
                  <li key={i} className={cx("flex items-center gap-3 border-b border-line px-4 py-3 last:border-0", r.is_me && "bg-primary-soft")}>
                    <span className={cx("w-7 text-center font-display font-bold", i < 3 ? "text-amber" : "text-faint")}>{i + 1}</span>
                    <span className="flex-1 font-semibold">{r.display_name}{r.is_me ? " (vous)" : ""}</span>
                    <LevelPill level={r.current_level} />
                    <span className="w-24 text-right text-sm"><strong>{r.weekly_xp}</strong> XP/sem.</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <Empty icon="crown" title="Personne n'apparaît encore dans le classement">Activez la visibilité pour être le premier.</Empty>
          )}
        </>
      )}
    </div>
  );
}
