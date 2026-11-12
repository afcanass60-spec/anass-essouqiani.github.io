"use client";

import { AlertTriangle, CheckCircle2, Loader2, Pencil, Play, Plus, Radar, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/toast";
import { Badge, Button, Card, Chip, Field, Input, Modal, MultiChips, Notice, PageHeader, Spinner, Textarea } from "@/components/ui";
import { api, Run, SavedSearch, Scheduler } from "@/lib/api";
import { CONTRACTS, fmtDateTime, LOCATIONS, relDate } from "@/lib/format";

type Resp = { items: SavedSearch[]; scheduler: Scheduler; sources: { key: string; label: string; configured: boolean }[] };
const FREQ: Record<string, string> = { manual: "Manuelle", "6h": "Toutes les 6 h", daily: "Quotidienne", weekly: "Hebdomadaire" };
type Form = { id?: number; name: string; keywords: string; sources: string[]; contracts: string[]; locations: string[]; radius_km: number; national: boolean; published_days: number; frequency: string; enabled: boolean };
const EMPTY: Form = { name: "", keywords: "", sources: [], contracts: ["alternance"], locations: ["Paris"], radius_km: 30, national: false, published_days: 14, frequency: "daily", enabled: true };

export default function SearchesPage() {
  const toast = useToast();
  const [data, setData] = useState<Resp | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [suggest, setSuggest] = useState<{ domain: string; label: string; keywords: string[] }[]>([]);

  const load = useCallback(async () => {
    const [d, r] = await Promise.all([api.get<Resp>("/api/searches"), api.get<Run[]>("/api/searches/runs/list")]);
    setData(d); setRuns(r);
  }, []);
  useEffect(() => { load(); api.get<typeof suggest>("/api/searches/suggestions").then(setSuggest); }, [load]);
  useEffect(() => {
    if (!runs.some((r) => r.status === "running")) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [runs, load]);

  async function runNow(s: SavedSearch) {
    try { await api.post(`/api/searches/${s.id}/run`); toast("Recherche lancée", "success"); load(); } catch (e) { toast((e as Error).message, "error"); }
  }
  async function save() {
    if (!form) return;
    const body = { name: form.name, keywords: form.keywords.split(/[\n,]/).map((k) => k.trim()).filter(Boolean), sources: form.sources, frequency: form.frequency, enabled: form.enabled,
      params: { contracts: form.contracts, locations: form.locations, radius_km: form.radius_km, national: form.national, published_days: form.published_days } };
    try {
      if (form.id) await api.put(`/api/searches/${form.id}`, body); else await api.post("/api/searches", body);
      setForm(null); load();
    } catch (e) { toast((e as Error).message, "error"); }
  }

  if (!data) return <Spinner />;
  const configured = data.sources.filter((s) => s.configured);
  return (
    <div className="space-y-5">
      <PageHeader title="Recherches & agent" subtitle="Recherches multisources, planification et rapports de l'agent."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setForm({ ...EMPTY })}>Nouvelle recherche</Button>} />
      <Notice tone={data.scheduler.active ? "success" : "warning"}>
        <b>{data.scheduler.message}</b>{data.scheduler.last_beat && ` (dernier battement ${relDate(data.scheduler.last_beat)})`}.{" "}
        {!data.scheduler.active && "Les fréquences « 6 h / quotidienne / hebdomadaire » ne s'exécuteront qu'une fois le worker et le beat Celery démarrés."}
      </Notice>
      {configured.length === 0 && <Notice tone="warning" className="flex gap-2"><AlertTriangle className="size-4 shrink-0" />Aucune source d&apos;offres n&apos;est configurée : ajoutez au moins une clé (France Travail, La Bonne Alternance, Adzuna…) dans le fichier .env. Voir Paramètres.</Notice>}

      <div className="grid gap-3 md:grid-cols-2">
        {data.items.map((s) => {
          const p = s.params as { contracts?: string[]; locations?: string[]; radius_km?: number; national?: boolean };
          const running = runs.some((r) => r.search_id === s.id && r.status === "running");
          return (
            <div key={s.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{s.name}</div>
                <Badge tone={s.frequency === "manual" ? "neutral" : "accent"}>{FREQ[s.frequency]}</Badge>
              </div>
              <div className="text-xs text-muted">{s.keywords.length ? s.keywords.join(" · ") : "Mots-clés déduits de votre profil"}</div>
              <div className="flex flex-wrap gap-1">
                {(p.contracts ?? []).map((c) => <Badge key={c}>{CONTRACTS.find((x) => x.key === c)?.label ?? c}</Badge>)}
                {p.national ? <Badge>National</Badge> : (p.locations ?? []).map((l) => <Badge key={l}>{l}</Badge>)}
                {!p.national && p.radius_km && <Badge>{p.radius_km} km</Badge>}
              </div>
              <div className="text-xs text-muted">Dernière exécution : {s.last_run_at ? fmtDateTime(s.last_run_at) : "jamais"}{s.next_run_at && s.frequency !== "manual" && ` · prochaine : ${fmtDateTime(s.next_run_at)}`}</div>
              <div className="mt-auto flex gap-1 pt-1">
                <Button size="sm" variant="primary" loading={running} icon={<Play className="size-3.5" />} onClick={() => runNow(s)}>{running ? "En cours…" : "Lancer maintenant"}</Button>
                <Button size="sm" variant="ghost" icon={<Pencil className="size-3.5" />} onClick={() => {
                  const pp = s.params as { contracts?: string[]; locations?: string[]; radius_km?: number; national?: boolean; published_days?: number };
                  setForm({ id: s.id, name: s.name, keywords: s.keywords.join("\n"), sources: s.sources, contracts: pp.contracts ?? [], locations: pp.locations ?? [], radius_km: pp.radius_km ?? 30, national: !!pp.national, published_days: pp.published_days ?? 14, frequency: s.frequency, enabled: s.enabled });
                }}>Modifier</Button>
                <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={async () => { if (confirm("Supprimer ?")) { await api.del(`/api/searches/${s.id}`); load(); } }} />
              </div>
            </div>
          );
        })}
      </div>

      <Card title="Rapports d'exécution" pad={false}>
        {runs.length === 0 ? <p className="p-4 text-sm text-muted">Aucune exécution.</p> : (
          <ul className="divide-y divide-border">
            {runs.map((r) => (
              <li key={r.id} className="flex gap-3 px-4 py-3">
                <div className="pt-0.5">{r.status === "running" ? <Loader2 className="size-4 animate-spin text-accent" /> : r.status === "done" ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-danger" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">{fmtDateTime(r.started_at)} · {r.trigger === "schedule" ? "planifiée" : "manuelle"} · {data.items.find((s) => s.id === r.search_id)?.name ?? "—"}</div>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-sm">{r.status === "running" ? "Recherche en cours…" : r.report}</pre>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Modifier la recherche" : "Nouvelle recherche"} wide>
        {form && (
          <div className="space-y-4">
            <Field label="Nom"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Mots-clés (un par ligne — laissez vide pour utiliser vos domaines cibles)">
              <Textarea rows={4} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {suggest.map((s) => <Chip key={s.domain} active={false} onClick={() => setForm({ ...form, keywords: [form.keywords, ...s.keywords].filter(Boolean).join("\n") })}><Radar className="mr-1 inline size-3" />{s.label}</Chip>)}
            </div>
            <Field label="Contrats"><MultiChips options={CONTRACTS} value={form.contracts} onChange={(contracts) => setForm({ ...form, contracts })} /></Field>
            <Field label="Lieux"><MultiChips options={LOCATIONS.map((l) => ({ key: l, label: l }))} value={form.locations} onChange={(locations) => setForm({ ...form, locations })} /></Field>
            <div className="flex flex-wrap gap-4">
              <Field label="Rayon"><div className="flex flex-wrap gap-1.5">{[10, 20, 30, 45, 60, 100].map((r) => <Chip key={r} active={form.radius_km === r} onClick={() => setForm({ ...form, radius_km: r })}>{r} km</Chip>)}</div></Field>
              <Field label="Publiées depuis"><div className="flex flex-wrap gap-1.5">{[1, 3, 7, 14, 30].map((d) => <Chip key={d} active={form.published_days === d} onClick={() => setForm({ ...form, published_days: d })}>{d} j</Chip>)}</div></Field>
            </div>
            <Chip active={form.national} onClick={() => setForm({ ...form, national: !form.national })}>Recherche nationale</Chip>
            <Field label="Sources (aucune = toutes les sources configurées)">
              <MultiChips options={data.sources.map((s) => ({ key: s.key, label: `${s.label}${s.configured ? "" : " (non configurée)"}` }))} value={form.sources} onChange={(sources) => setForm({ ...form, sources })} />
            </Field>
            <Field label="Fréquence"><div className="flex flex-wrap gap-1.5">{Object.entries(FREQ).map(([k, l]) => <Chip key={k} active={form.frequency === k} onClick={() => setForm({ ...form, frequency: k })}>{l}</Chip>)}</div></Field>
            <div className="flex justify-end gap-2"><Button onClick={() => setForm(null)}>Annuler</Button><Button variant="primary" disabled={!form.name} onClick={save}>Enregistrer</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
