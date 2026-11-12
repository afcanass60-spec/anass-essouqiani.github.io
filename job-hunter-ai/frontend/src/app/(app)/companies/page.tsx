"use client";

import { Building2, Eye, Plus, RefreshCw, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useToast } from "@/components/toast";
import { Badge, Button, Chip, Empty, Field, Input, Modal, Notice, PageHeader, Select, Spinner, Textarea, Toggle } from "@/components/ui";
import { api, Company } from "@/lib/api";
import { COMPANY_TYPES, relDate } from "@/lib/format";

type Resp = { items: Company[]; detected: { name: string; offers: number; best_score: number | null }[]; providers: string[] };
const EMPTY = { name: "", sector: "", company_type: "", careers_url: "", ats_provider: "", ats_slug: "", is_favorite: false, watch: false, notes: "" };

export default function CompaniesPage() {
  const toast = useToast();
  const [data, setData] = useState<Resp | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [onlyFav, setOnlyFav] = useState(false);
  const [edit, setEdit] = useState<(typeof EMPTY & { id?: number }) | null>(null);
  const [detect, setDetect] = useState("");
  const [checking, setChecking] = useState<number | null>(null);
  const load = useCallback(() => api.get<Resp>("/api/companies").then(setData), []);
  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => (data?.items ?? []).filter((c) =>
    (!q || `${c.name} ${c.sector}`.toLowerCase().includes(q.toLowerCase())) && (!type || c.company_type === type) && (!onlyFav || c.is_favorite)), [data, q, type, onlyFav]);

  async function save() {
    if (!edit) return;
    const body = { ...edit, careers_url: edit.careers_url || null, ats_provider: edit.ats_provider || null, ats_slug: edit.ats_slug || null };
    try {
      if (edit.id) await api.put(`/api/companies/${edit.id}`, body); else await api.post("/api/companies", body);
      setEdit(null); load();
    } catch (e) { toast((e as Error).message, "error"); }
  }
  async function quick(c: Company, p: Partial<Company>) {
    await api.put(`/api/companies/${c.id}`, { ...c, ...p, careers_url: c.careers_url || null, ats_provider: c.ats_provider || null, ats_slug: c.ats_slug || null });
    load();
  }
  async function check(c: Company) {
    setChecking(c.id);
    try { const r = await api.post<{ status: string; new: number }>(`/api/companies/${c.id}/check`); toast(`${c.name} : ${r.status}`, "success"); load(); }
    catch (e) { toast((e as Error).message, "error"); } finally { setChecking(null); }
  }
  async function runDetect() {
    if (!edit?.careers_url) return;
    const r = await api.post<{ provider: string | null; slug: string | null; supported: boolean; message: string }>("/api/companies/detect", { url: edit.careers_url });
    setDetect(r.message);
    if (r.supported) setEdit({ ...edit, ats_provider: r.provider ?? "", ats_slug: r.slug ?? "" });
  }

  if (!data) return <Spinner />;
  return (
    <div className="space-y-5">
      <PageHeader title="Entreprises" subtitle="Ciblez des entreprises, suivez leurs pages carrières et repérez celles qui recrutent."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => { setEdit({ ...EMPTY }); setDetect(""); }}>Ajouter</Button>} />
      <Notice>Le suivi automatique utilise les API publiques des ATS (Greenhouse, Lever, SmartRecruiters, Recruitee, Ashby) ou, à défaut, les offres structurées de la page (schema.org) et la détection de changements. Renseignez l&apos;URL de la page carrière : l&apos;ATS est détecté automatiquement.</Notice>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Filtrer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Chip active={!type} onClick={() => setType("")}>Toutes</Chip>
        {Object.entries(COMPANY_TYPES).map(([k, l]) => <Chip key={k} active={type === k} onClick={() => setType(k)}>{l}</Chip>)}
        <Toggle checked={onlyFav} onChange={setOnlyFav} label="Favoris" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button className="truncate text-left font-semibold hover:text-accent" onClick={() => { setEdit({ ...EMPTY, ...c, careers_url: c.careers_url ?? "", ats_provider: c.ats_provider ?? "", ats_slug: c.ats_slug ?? "" }); setDetect(""); }}>{c.name}</button>
                <div className="text-xs text-muted">{c.sector}{c.company_type && ` · ${COMPANY_TYPES[c.company_type] ?? c.company_type}`}</div>
              </div>
              <button onClick={() => quick(c, { is_favorite: !c.is_favorite })} aria-label="Favori" className={c.is_favorite ? "text-warning" : "text-muted hover:text-text"}><Star className="size-4" fill={c.is_favorite ? "currentColor" : "none"} /></button>
            </div>
            <div className="flex flex-wrap gap-1">
              {c.offers_count > 0 && <Link href={`/offers?q=${encodeURIComponent(c.name)}`}><Badge tone="accent">{c.offers_count} offre(s)</Badge></Link>}
              {c.ats_provider ? <Badge tone="success">{c.ats_provider}</Badge> : c.careers_url ? <Badge>Page carrière</Badge> : <Badge tone="warning">Page carrière à renseigner</Badge>}
              {c.watch && <Badge tone="accent"><Eye className="size-3" />Surveillée</Badge>}
            </div>
            {c.last_check_status && <p className="text-xs text-muted">{c.last_check_status} · {relDate(c.last_checked_at)}</p>}
            <div className="mt-auto flex gap-1 pt-1">
              <Button size="sm" variant="ghost" onClick={() => quick(c, { watch: !c.watch })}>{c.watch ? "Ne plus surveiller" : "Surveiller"}</Button>
              <Button size="sm" variant="ghost" loading={checking === c.id} disabled={!c.careers_url && !c.ats_slug} icon={<RefreshCw className="size-3.5" />} onClick={() => check(c)}>Vérifier</Button>
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && <Empty icon={<Building2 className="size-6" />} title="Aucune entreprise" />}
      {data.detected.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Entreprises détectées dans vos offres</h2>
          <div className="flex flex-wrap gap-2">
            {data.detected.map((d) => (
              <button key={d.name} onClick={() => setEdit({ ...EMPTY, name: d.name })} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-left text-xs hover:border-accent/40">
                <span className="font-medium">{d.name}</span> <span className="text-muted">· {d.offers} offre(s){d.best_score != null && ` · max ${d.best_score}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Modifier l'entreprise" : "Nouvelle entreprise"}>
        {edit && (
          <div className="space-y-3">
            <Field label="Nom"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Secteur"><Input value={edit.sector} onChange={(e) => setEdit({ ...edit, sector: e.target.value })} /></Field>
              <Field label="Type"><Select value={edit.company_type} onChange={(e) => setEdit({ ...edit, company_type: e.target.value })}><option value="">—</option>{Object.entries(COMPANY_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            </div>
            <Field label="URL de la page carrière"><div className="flex gap-2"><Input value={edit.careers_url} onChange={(e) => setEdit({ ...edit, careers_url: e.target.value })} placeholder="https://…" /><Button onClick={runDetect}>Détecter</Button></div></Field>
            {detect && <Notice>{detect}</Notice>}
            <div className="grid grid-cols-2 gap-3">
              <Field label="ATS"><Select value={edit.ats_provider} onChange={(e) => setEdit({ ...edit, ats_provider: e.target.value })}><option value="">Aucun / inconnu</option>{data.providers.map((p) => <option key={p} value={p}>{p}</option>)}</Select></Field>
              <Field label="Identifiant ATS"><Input value={edit.ats_slug} onChange={(e) => setEdit({ ...edit, ats_slug: e.target.value })} /></Field>
            </div>
            <Toggle checked={edit.is_favorite} onChange={(v) => setEdit({ ...edit, is_favorite: v })} label="Favori" />
            <Toggle checked={edit.watch} onChange={(v) => setEdit({ ...edit, watch: v })} label="Surveiller la page carrière (quotidien, si le planificateur est actif)" />
            <Field label="Notes"><Textarea rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
            <div className="flex justify-between">
              {edit.id ? <Button variant="danger" onClick={async () => { await api.del(`/api/companies/${edit.id}`); setEdit(null); load(); }}>Supprimer</Button> : <span />}
              <Button variant="primary" disabled={!edit.name} onClick={save}>Enregistrer</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
