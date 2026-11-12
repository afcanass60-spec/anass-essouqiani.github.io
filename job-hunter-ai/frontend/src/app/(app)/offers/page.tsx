"use client";

import { Filter, Plus, RotateCcw, SearchX } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { OfferCard } from "@/components/OfferCard";
import { useToast } from "@/components/toast";
import { Button, Chip, Empty, Field, Input, Modal, MultiChips, Notice, PageHeader, Select, Spinner, Textarea, Toggle } from "@/components/ui";
import { api, Offer } from "@/lib/api";
import { COMPANY_TYPES, CONTRACTS, LOCATIONS, SOURCE_LABELS } from "@/lib/format";

type Filters = {
  q: string; contracts: string[]; locations: string[]; radius_km: number; national: boolean; work_modes: string[];
  travel_max: number | null; include_unknown_travel: boolean; salary_min: string; salary_max: string;
  salary_unit: "annual_gross" | "monthly_gross" | "monthly_net"; include_no_salary: boolean; only_no_salary: boolean;
  published_within: string; education_levels: number[]; beginner_ok: boolean; max_experience_years: string;
  company_types: string[]; sector: string; start_after: string; start_before: string; license: string; english: string;
  min_score: string; statuses: string[]; sources: string[]; active_only: boolean; urgent_only: boolean;
  sort: "score" | "newest" | "salary" | "travel";
};

const DEFAULTS: Filters = {
  q: "", contracts: [], locations: [], radius_km: 30, national: false, work_modes: [], travel_max: null, include_unknown_travel: true,
  salary_min: "", salary_max: "", salary_unit: "annual_gross", include_no_salary: true, only_no_salary: false, published_within: "",
  education_levels: [], beginner_ok: false, max_experience_years: "", company_types: [], sector: "", start_after: "", start_before: "",
  license: "", english: "", min_score: "", statuses: ["new", "saved"], sources: [], active_only: true, urgent_only: false, sort: "score",
};

function toPayload(f: Filters, page: number) {
  const num = (s: string) => (s === "" ? null : Number(s));
  return {
    ...f, page, page_size: 30,
    salary_min: num(f.salary_min), salary_max: num(f.salary_max), min_score: num(f.min_score),
    max_experience_years: num(f.max_experience_years), published_within: f.published_within || null,
    sector: f.sector || null, license: f.license || null, english: f.english || null,
    start_after: f.start_after || null, start_before: f.start_before || null, q: f.q || null,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2 border-b border-border pb-4 last:border-0"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>{children}</div>;
}

function FilterPanel({ f, set, reset }: { f: Filters; set: (p: Partial<Filters>) => void; reset: () => void }) {
  const [custom, setCustom] = useState("");
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Filtres</span>
        <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={reset}>Réinitialiser</Button>
      </div>
      <Section title="Type de contrat"><MultiChips options={CONTRACTS} value={f.contracts} onChange={(contracts) => set({ contracts })} /></Section>
      <Section title="Localisation">
        <Toggle checked={f.national} onChange={(national) => set({ national })} label="Recherche nationale" />
        {!f.national && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {[...LOCATIONS, ...f.locations.filter((l) => !LOCATIONS.includes(l))].map((l) => <Chip key={l} active={f.locations.includes(l)} onClick={() => set({ locations: toggle(f.locations, l) })}>{l}</Chip>)}
            </div>
            <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) { set({ locations: [...f.locations, custom.trim()] }); setCustom(""); } }}>
              <Input placeholder="Autre ville…" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <Button type="submit" size="md">Ajouter</Button>
            </form>
            <Field label={`Rayon : ${f.radius_km} km`}>
              <div className="flex flex-wrap gap-1.5">{[10, 20, 30, 45, 60, 100].map((r) => <Chip key={r} active={f.radius_km === r} onClick={() => set({ radius_km: r })}>{r} km</Chip>)}</div>
            </Field>
          </>
        )}
        <MultiChips options={[{ key: "remote", label: "Télétravail" }, { key: "hybrid", label: "Hybride" }, { key: "onsite", label: "Sur site" }]} value={f.work_modes} onChange={(work_modes) => set({ work_modes })} />
      </Section>
      <Section title="Temps de trajet (réel)">
        <div className="flex flex-wrap gap-1.5">
          {[null, 30, 45, 60, 90].map((t) => <Chip key={String(t)} active={f.travel_max === t} onClick={() => set({ travel_max: t })}>{t == null ? "Indifférent" : t < 60 ? `< ${t} min` : t === 60 ? "< 1 h" : "< 1 h 30"}</Chip>)}
        </div>
        {f.travel_max != null && <Toggle checked={f.include_unknown_travel} onChange={(v) => set({ include_unknown_travel: v })} label="Inclure les trajets non calculés" />}
        <p className="text-[11px] text-muted">Calculé via Île-de-France Mobilités / OpenRouteService depuis votre adresse (Profil). Jamais déduit de la distance.</p>
      </Section>
      <Section title="Salaire">
        <Select value={f.salary_unit} onChange={(e) => set({ salary_unit: e.target.value as Filters["salary_unit"] })}>
          <option value="annual_gross">Annuel brut (€)</option><option value="monthly_gross">Mensuel brut (€)</option><option value="monthly_net">Mensuel net estimé (€)</option>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} placeholder="Min" value={f.salary_min} onChange={(e) => set({ salary_min: e.target.value })} />
          <Input type="number" min={0} placeholder="Max" value={f.salary_max} onChange={(e) => set({ salary_max: e.target.value })} />
        </div>
        <Toggle checked={f.include_no_salary} onChange={(v) => set({ include_no_salary: v, only_no_salary: false })} label="Inclure « non communiqué »" />
        <Toggle checked={f.only_no_salary} onChange={(v) => set({ only_no_salary: v })} label="Uniquement « non communiqué »" />
      </Section>
      <Section title="Date de publication">
        <div className="flex flex-wrap gap-1.5">
          {[["", "Toutes"], ["today", "Aujourd'hui"], ["1", "24 h"], ["3", "3 j"], ["7", "7 j"], ["14", "14 j"], ["30", "30 j"]].map(([k, l]) =>
            <Chip key={k} active={f.published_within === k} onClick={() => set({ published_within: k })}>{l}</Chip>)}
        </div>
      </Section>
      <Section title="Niveau & expérience">
        <div className="flex flex-wrap gap-1.5">{[2, 3, 4, 5].map((l) => <Chip key={l} active={f.education_levels.includes(l)} onClick={() => set({ education_levels: toggle(f.education_levels, l) })}>Bac+{l}</Chip>)}</div>
        <Toggle checked={f.beginner_ok} onChange={(beginner_ok) => set({ beginner_ok })} label="Débutant accepté / junior" />
        <Field label="Expérience demandée max (années)"><Input type="number" min={0} value={f.max_experience_years} onChange={(e) => set({ max_experience_years: e.target.value })} /></Field>
      </Section>
      <Section title="Entreprise">
        <MultiChips options={Object.entries(COMPANY_TYPES).map(([key, label]) => ({ key, label }))} value={f.company_types} onChange={(company_types) => set({ company_types })} />
        <Select value={f.sector} onChange={(e) => set({ sector: e.target.value })}><option value="">Public et privé</option><option value="prive">Secteur privé</option><option value="public">Secteur public</option></Select>
      </Section>
      <Section title="Conditions">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Début après"><Input type="date" value={f.start_after} onChange={(e) => set({ start_after: e.target.value })} /></Field>
          <Field label="Début avant"><Input type="date" value={f.start_before} onChange={(e) => set({ start_before: e.target.value })} /></Field>
        </div>
        <Select value={f.license} onChange={(e) => set({ license: e.target.value })}><option value="">Permis : indifférent</option><option value="not_required">Permis non exigé</option><option value="required">Permis exigé</option></Select>
        <Select value={f.english} onChange={(e) => set({ english: e.target.value })}><option value="">Anglais : indifférent</option><option value="not_required">Anglais non exigé</option><option value="required">Anglais exigé</option></Select>
      </Section>
      <Section title="Score & état">
        <div className="flex flex-wrap gap-1.5">{[["", "Tous"], ["60", "≥ 60"], ["70", "≥ 70"], ["80", "≥ 80"], ["90", "≥ 90"]].map(([k, l]) => <Chip key={k} active={f.min_score === k} onClick={() => set({ min_score: k })}>{l}</Chip>)}</div>
        <MultiChips options={[{ key: "new", label: "Nouvelles" }, { key: "saved", label: "Sauvegardées" }, { key: "applied", label: "Candidatées" }, { key: "ignored", label: "Ignorées" }]} value={f.statuses} onChange={(statuses) => set({ statuses })} />
        <Toggle checked={f.urgent_only} onChange={(urgent_only) => set({ urgent_only })} label="Urgentes uniquement" />
        <Toggle checked={!f.active_only} onChange={(v) => set({ active_only: !v })} label="Inclure expirées / pourvues" />
      </Section>
      <Section title="Sources">
        <MultiChips options={Object.entries(SOURCE_LABELS).map(([key, label]) => ({ key, label }))} value={f.sources} onChange={(sources) => set({ sources })} />
      </Section>
    </div>
  );
}

function ImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<"text" | "url">("text");
  const [form, setForm] = useState({ url: "", title: "", company: "", location: "", contract: "", salary: "", description: "", source: "manual" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  async function submit() {
    setLoading(true); setErr("");
    try {
      const body = mode === "url" ? { url: form.url } : form;
      const r = await api.post<{ imported: { status: string }[] }>("/api/offers/import", body);
      toast(r.imported.map((x) => (x.status === "new" ? "Offre ajoutée" : "Déjà connue : sources fusionnées")).join(" · "), "success");
      onDone(); onClose();
    } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
  }
  const up = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} title="Importer une annonce" wide>
      <div className="space-y-3">
        <div className="flex gap-1.5"><Chip active={mode === "text"} onClick={() => setMode("text")}>Copier-coller</Chip><Chip active={mode === "url"} onClick={() => setMode("url")}>Depuis une URL</Chip></div>
        {mode === "url" ? (
          <>
            <Field label="URL de l'annonce (page carrière d'entreprise)"><Input value={form.url} onChange={up("url")} placeholder="https://…" /></Field>
            <Notice>LinkedIn, Indeed, WTTJ, Apec, HelloWork… interdisent la collecte automatisée : pour ces sites, utilisez le copier-coller.</Notice>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Intitulé *"><Input value={form.title} onChange={up("title")} /></Field>
              <Field label="Entreprise"><Input value={form.company} onChange={up("company")} /></Field>
              <Field label="Lieu"><Input value={form.location} onChange={up("location")} placeholder="Ville" /></Field>
              <Field label="Contrat"><Input value={form.contract} onChange={up("contract")} placeholder="Alternance, CDI…" /></Field>
              <Field label="Salaire"><Input value={form.salary} onChange={up("salary")} placeholder="ex : 35-40 k€" /></Field>
              <Field label="Plateforme d'origine">
                <Select value={form.source} onChange={up("source")}>
                  {["manual", "linkedin", "indeed", "welcome_to_the_jungle", "apec", "hellowork", "jobteaser", "meteojob", "chooseyourboss"].map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]?.replace(" (alerte)", "") ?? s}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Lien de l'annonce"><Input value={form.url} onChange={up("url")} placeholder="https://…" /></Field>
            <Field label="Description complète *"><Textarea rows={8} value={form.description} onChange={up("description")} /></Field>
          </>
        )}
        {err && <Notice tone="danger">{err}</Notice>}
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Annuler</Button><Button variant="primary" loading={loading} onClick={submit}>Importer et analyser</Button></div>
      </div>
    </Modal>
  );
}

function OffersInner() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo<Filters>(() => ({
    ...DEFAULTS,
    q: params.get("q") ?? "",
    contracts: params.get("contracts")?.split(",").filter(Boolean) ?? [],
    min_score: params.get("min_score") ?? "",
    statuses: params.get("status") ? [params.get("status")!] : DEFAULTS.statuses,
    published_within: params.get("published") ?? "",
    sort: (params.get("sort") as Filters["sort"]) ?? "score",
  }), [params]);
  const [f, setF] = useState<Filters>(initial);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: Offer[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => setF(initial), [initial]);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.post("/api/offers/search", toPayload(f, page))); } catch (e) { toast((e as Error).message, "error"); } finally { setLoading(false); }
  }, [f, page, toast]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const set = (p: Partial<Filters>) => { setPage(1); setF((x) => ({ ...x, ...p })); };
  async function setStatus(o: Offer, status: string) {
    setBusy(o.id);
    try { await api.patch(`/api/offers/${o.id}/status`, { status }); await load(); } finally { setBusy(null); }
  }
  async function apply(o: Offer) {
    setBusy(o.id);
    try { const a = await api.post<{ id: number }>(`/api/applications/from-offer/${o.id}`); toast("Ajoutée aux candidatures", "success"); router.push(`/studio/prepare/${o.id}?application=${a.id}`); }
    catch (e) { toast((e as Error).message, "error"); } finally { setBusy(null); }
  }

  return (
    <div>
      <PageHeader title="Offres" subtitle={data ? `${data.total} offre(s) correspondant aux filtres — doublons regroupés` : "…"}
        actions={<>
          <Button className="lg:hidden" icon={<Filter className="size-4" />} onClick={() => setMobileFilters(true)}>Filtres</Button>
          <Select value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters["sort"] })} className="w-44">
            <option value="score">Meilleur score</option><option value="newest">Plus récentes</option><option value="salary">Salaire</option><option value="travel">Trajet le plus court</option>
          </Select>
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setImportOpen(true)}>Importer</Button>
        </>} />
      <div className="flex gap-6">
        <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-72 shrink-0 overflow-y-auto pr-2 scrollbar-thin lg:block">
          <Input placeholder="Mots-clés…" value={f.q} onChange={(e) => set({ q: e.target.value })} className="mb-4" />
          <FilterPanel f={f} set={set} reset={() => setF(DEFAULTS)} />
        </aside>
        <div className="min-w-0 flex-1 space-y-3">
          {loading && !data ? <Spinner /> : data && data.items.length === 0 ? (
            <Empty icon={<SearchX className="size-6" />} title="Aucune offre ne correspond">
              Élargissez les filtres, lancez une recherche depuis « Recherches & agent », ou importez une annonce.
            </Empty>
          ) : (
            data?.items.map((o) => <OfferCard key={o.id} offer={o} busy={busy === o.id} onStatus={(s) => setStatus(o, s)} onApply={() => apply(o)} />)
          )}
          {data && data.total > 30 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Précédent</Button>
              <span className="text-xs text-muted">Page {page} / {Math.ceil(data.total / 30)}</span>
              <Button size="sm" disabled={page * 30 >= data.total} onClick={() => setPage(page + 1)}>Suivant</Button>
            </div>
          )}
        </div>
      </div>
      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filtres">
        <Input placeholder="Mots-clés…" value={f.q} onChange={(e) => set({ q: e.target.value })} className="mb-4" />
        <FilterPanel f={f} set={set} reset={() => setF(DEFAULTS)} />
      </Modal>
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={load} />
    </div>
  );
}

export default function OffersPage() {
  return <Suspense fallback={<Spinner />}><OffersInner /></Suspense>;
}
