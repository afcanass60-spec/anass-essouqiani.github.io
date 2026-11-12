"use client";

import { AlertTriangle, ArrowRight, Bell, Briefcase, Building2, CalendarCheck, Radar, Sparkles, Star, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { OfferRow } from "@/components/OfferCard";
import { Badge, Card, Empty, Notice, PageHeader, Spinner } from "@/components/ui";
import { api, Offer, Run, Scheduler } from "@/lib/api";
import { fmtDateTime, relDate, SOURCE_LABELS } from "@/lib/format";

type Dash = {
  kpis: Record<string, number>;
  offers_per_day: { day: string; count: number }[];
  score_distribution: { label: string; count: number }[];
  by_source: { source: string; count: number }[];
  pipeline: { status: string; count: number }[];
  top_offers: Offer[];
  last_run: Run | null;
  scheduler: Scheduler;
  followups: { id: number; company: string; title: string; next_action_at: string }[];
};

const KPI = [
  { key: "total", label: "Offres actives", icon: Target, href: "/offers" },
  { key: "new_today", label: "Nouvelles aujourd'hui", icon: Sparkles, href: "/offers?published=today&sort=newest" },
  { key: "above_80", label: "Score ≥ 80 %", icon: TrendingUp, href: "/offers?min_score=80" },
  { key: "alternance", label: "Alternances", icon: Radar, href: "/offers?contracts=alternance" },
  { key: "cdi", label: "CDI", icon: Briefcase, href: "/offers?contracts=cdi" },
  { key: "companies", label: "Entreprises détectées", icon: Building2, href: "/companies" },
  { key: "applications_sent", label: "Candidatures envoyées", icon: Briefcase, href: "/applications" },
  { key: "interviews", label: "Entretiens obtenus", icon: CalendarCheck, href: "/applications" },
  { key: "saved", label: "Offres sauvegardées", icon: Star, href: "/offers?status=saved" },
];

function ChartTip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md">
      <div className="text-muted">{label}</div>
      <div className="font-semibold tabular-nums">{payload[0].value} {unit}</div>
    </div>
  );
}

const axis = { stroke: "var(--muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

export default function Dashboard() {
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.get<Dash>("/api/dashboard").then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Notice tone="danger">{err}</Notice>;
  if (!d) return <Spinner />;
  const perDay = d.offers_per_day.map((x) => ({ ...x, label: new Date(x.day).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) }));

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre recherche et de l'activité de l'agent." />

      <Notice tone={d.scheduler.active ? "success" : "warning"} className="flex items-start gap-2">
        {d.scheduler.active ? <Radar className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
        <div>
          <span className="font-medium">{d.scheduler.message}</span>
          {d.scheduler.last_beat && <span className="ml-1 opacity-80">· dernier battement {relDate(d.scheduler.last_beat)}</span>}
          {!d.scheduler.active && <span className="block opacity-80">Les recherches immédiates fonctionnent ; pour l&apos;automatisation, démarrez les services worker + beat (voir docs/DEPLOIEMENT.md).</span>}
        </div>
      </Notice>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
        {KPI.map(({ key, label, icon: Icon, href }) => (
          <Link key={key} href={href} className="group rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/50">
            <div className="flex items-center justify-between text-muted"><Icon className="size-4" /><ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" /></div>
            <div className="mt-3 text-2xl font-semibold tabular-nums">{d.kpis[key] ?? 0}</div>
            <div className="mt-0.5 text-xs text-muted">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Nouvelles offres (14 jours)" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={perDay} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap={6}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<ChartTip unit="offre(s)" />} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Répartition des scores">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={d.score_distribution} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap={8}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<ChartTip unit="offre(s)" />} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Meilleures correspondances" className="lg:col-span-2" pad={false}
          action={<Link href="/offers" className="text-xs text-muted hover:text-text">Toutes les offres →</Link>}>
          {d.top_offers.length ? (
            <div className="divide-y divide-border">{d.top_offers.map((o) => <OfferRow key={o.id} offer={o} />)}</div>
          ) : (
            <div className="p-4"><Empty icon={<Target className="size-6" />} title="Aucune offre pour l'instant">
              Configurez une source (Paramètres) puis lancez une recherche, ou importez une annonce manuellement.
            </Empty></div>
          )}
        </Card>
        <div className="space-y-4">
          <Card title="Dernier rapport de l'agent" action={d.last_run && <span className="text-xs text-muted">{fmtDateTime(d.last_run.finished_at)}</span>}>
            {d.last_run ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{d.last_run.report}</pre>
            ) : <p className="text-sm text-muted">Aucune recherche exécutée.</p>}
            <Link href="/searches" className="mt-3 inline-block text-xs text-accent">Gérer les recherches →</Link>
          </Card>
          <Card title="Sources des offres">
            {d.by_source.length ? (
              <ul className="space-y-2">
                {[...d.by_source].sort((a, b) => b.count - a.count).map((s) => {
                  const max = Math.max(...d.by_source.map((x) => x.count));
                  return (
                    <li key={s.source} className="text-sm">
                      <div className="mb-1 flex justify-between"><span>{SOURCE_LABELS[s.source] ?? s.source}</span><span className="tabular-nums text-muted">{s.count}</span></div>
                      <div className="h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-accent" style={{ width: `${(s.count / max) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="text-sm text-muted">—</p>}
          </Card>
          {d.followups.length > 0 && (
            <Card title={<span className="flex items-center gap-1.5"><Bell className="size-4" /> Relances à faire</span>}>
              <ul className="space-y-2">
                {d.followups.map((f) => (
                  <li key={f.id}><Link href={`/applications/${f.id}`} className="flex items-center justify-between gap-2 text-sm hover:text-accent">
                    <span className="truncate">{f.company} — {f.title}</span><Badge tone="warning">{relDate(f.next_action_at)}</Badge></Link></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
