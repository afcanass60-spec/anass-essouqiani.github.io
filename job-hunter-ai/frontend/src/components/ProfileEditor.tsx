"use client";

import { ArrowDown, ArrowUp, History, Plus, Trash2, Upload, X } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";

import { api, Profile } from "@/lib/api";
import { CONTRACTS, fmtDateTime, LOCATIONS } from "@/lib/format";
import { useToast } from "./toast";
import { Badge, Button, Card, Chip, Field, Input, Modal, MultiChips, Notice, Select, Spinner, Textarea, Toggle } from "./ui";

const SKILL_CATS: Record<string, string> = { systemes: "Systèmes", reseaux: "Réseaux", cloud: "Cloud & M365", devops: "DevOps", securite: "Cybersécurité",
  virtualisation: "Virtualisation", methodes: "Méthodes", outils: "Outils", support: "Support", langages: "Langages", data: "Data & IA", soft: "Savoir-être", autre: "Autres" };
const DOMAINS: Record<string, string> = { admin_sys_reseau: "Admin. systèmes & réseaux", infrastructure: "Infrastructure IT", cloud: "Cloud", devops: "DevOps / DevSecOps",
  cyber: "Cybersécurité", support_n2: "Support N2", m365: "Microsoft 365", projet_it: "Gestion de projets IT", data_ia: "Data / IA" };
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

function ListEditor<T extends Record<string, unknown>>({ title, items, onChange, blank, render, hint }: {
  title: string; items: T[]; onChange: (v: T[]) => void; blank: () => T; render: (item: T, set: (p: Partial<T>) => void) => ReactNode; hint?: string;
}) {
  const move = (i: number, d: number) => { const x = [...items]; const [m] = x.splice(i, 1); x.splice(i + d, 0, m); onChange(x); };
  return (
    <Card title={title} action={<Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => onChange([...items, blank()])}>Ajouter</Button>}>
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-muted">Aucun élément.</p>}
        {items.map((it, i) => (
          <div key={(it.id as string) ?? i} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex justify-end gap-1">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Monter"><ArrowUp className="size-3.5" /></button>
              <button disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Descendre"><ArrowDown className="size-3.5" /></button>
              <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded p-1 text-danger hover:bg-danger-soft" aria-label="Supprimer"><Trash2 className="size-3.5" /></button>
            </div>
            {render(it, (p) => onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x))))}
          </div>
        ))}
      </div>
    </Card>
  );
}

type ImportResult = { method: string; heuristic: { identity: Record<string, string>; skills_detected: string[] }; structured: null | {
  identity: Record<string, string>; summary: string; experiences: Profile["experiences"]; education: Profile["education"]; skills: Profile["skills"];
  certifications: Profile["certifications"]; languages: Profile["languages"]; projects: Profile["projects"]; interests: string[] } };

export default function ProfileEditor() {
  const toast = useToast();
  const [p, setP] = useState<Profile | null>(null);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: "", category: "systemes" });
  const [imp, setImp] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const [revs, setRevs] = useState<{ id: number; version: number; note: string; created_at: string }[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => api.get<{ data: Profile; version: number }>("/api/profile").then((r) => { setP(r.data); setVersion(r.version); setDirty(false); });
  useEffect(() => { load(); }, []);
  if (!p) return <Spinner />;
  const set = (patch: Partial<Profile>) => { setP({ ...p, ...patch }); setDirty(true); };
  const setId = (k: string, v: string | boolean | null) => set({ identity: { ...p.identity, [k]: v } });
  const setPref = (patch: Partial<Profile["preferences"]>) => set({ preferences: { ...p.preferences, ...patch } });

  async function save() {
    setSaving(true);
    try { const r = await api.put<{ data: Profile; version: number }>("/api/profile", { ...p, note: "Modification du profil" }); setP(r.data); setVersion(r.version); setDirty(false); toast("Profil enregistré — scores recalculés en arrière-plan", "success"); }
    catch (e) { toast((e as Error).message, "error"); } finally { setSaving(false); }
  }
  async function upload(f: File) {
    setImporting(true);
    try {
      const r = await api.upload<ImportResult>("/api/profile/import-cv", f);
      setImp(r);
      setPick({ identity: true, summary: !p!.summary, skills: true, experiences: true, education: true, certifications: true, languages: true, projects: true });
    } catch (e) { toast((e as Error).message, "error"); } finally { setImporting(false); }
  }
  function merge() {
    if (!imp || !p) return;
    const s = imp.structured;
    const next = { ...p };
    const ident = s?.identity ?? imp.heuristic.identity;
    if (pick.identity) next.identity = { ...p.identity, ...Object.fromEntries(Object.entries(ident).filter(([, v]) => v)) };
    if (s && pick.summary && s.summary) next.summary = s.summary;
    const names = new Set(p.skills.map((x) => x.name.toLowerCase()));
    const newSkills = (s?.skills ?? imp.heuristic.skills_detected.map((n) => ({ name: n, category: "autre" }))).filter((x) => !names.has(x.name.toLowerCase()));
    if (pick.skills) next.skills = [...p.skills, ...newSkills];
    if (s) {
      if (pick.experiences) next.experiences = [...p.experiences, ...s.experiences.map((e) => ({ ...e, id: uid("exp"), current: false }))];
      if (pick.education) next.education = [...p.education, ...s.education.map((e) => ({ ...e, id: uid("edu") }))];
      if (pick.certifications) next.certifications = [...p.certifications, ...s.certifications.map((e) => ({ ...e, id: uid("cer") }))];
      if (pick.languages) next.languages = [...p.languages, ...s.languages];
      if (pick.projects) next.projects = [...p.projects, ...s.projects.map((e) => ({ ...e, id: uid("pro") }))];
    }
    setP(next); setDirty(true); setImp(null);
    toast("Éléments ajoutés : vérifiez, supprimez les doublons puis enregistrez.", "info");
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface/95 px-3 py-2 backdrop-blur">
        <div className="text-xs text-muted">Votre profil est la <b className="text-text">source de vérité</b> : scoring, CV et lettres n&apos;utilisent que ces informations. Version {version}.</div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button size="sm" loading={importing} icon={<Upload className="size-3.5" />} onClick={() => fileRef.current?.click()}>Importer un CV</Button>
          <Button size="sm" icon={<History className="size-3.5" />} onClick={() => api.get<typeof revs>("/api/profile/revisions").then(setRevs)}>Historique</Button>
          <Button size="sm" variant="primary" loading={saving} disabled={!dirty} onClick={save}>Enregistrer</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Identité">
          <div className="grid gap-3 sm:grid-cols-2">
            {([["full_name", "Nom complet"], ["headline", "Titre"], ["email", "Email"], ["phone", "Téléphone"], ["city", "Ville"], ["linkedin", "LinkedIn"], ["website", "Site / GitHub"]] as const).map(([k, l]) => (
              <Field key={k} label={l}><Input value={(p.identity[k] as string) ?? ""} onChange={(e) => setId(k, e.target.value)} /></Field>
            ))}
            <Field label="Permis B">
              <Select value={p.identity.driving_license == null ? "" : String(p.identity.driving_license)} onChange={(e) => setId("driving_license", e.target.value === "" ? null : e.target.value === "true")}>
                <option value="">Non renseigné</option><option value="true">Oui</option><option value="false">Non</option>
              </Select>
            </Field>
          </div>
          <Field label="Résumé de profil"><Textarea rows={3} value={p.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="2–3 phrases factuelles" /></Field>
        </Card>

        <Card title="Préférences de recherche">
          <div className="space-y-3">
            <Field label="Contrats recherchés"><MultiChips options={CONTRACTS} value={p.preferences.contracts} onChange={(contracts) => setPref({ contracts, contract_priority: contracts })} /></Field>
            <Field label="Lieux"><MultiChips options={LOCATIONS.map((l) => ({ key: l, label: l }))} value={p.preferences.locations} onChange={(locations) => setPref({ locations })} /></Field>
            <Field label="Domaines visés"><MultiChips options={Object.entries(DOMAINS).map(([key, label]) => ({ key, label }))} value={p.preferences.domains} onChange={(domains) => setPref({ domains })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Adresse de départ (temps de trajet)" hint={p.preferences.home.lat ? "Géolocalisée ✓" : "Adresse ou ville — géocodée à l'enregistrement"}>
                <Input value={p.preferences.home.label} onChange={(e) => setPref({ home: { label: e.target.value, lat: null, lon: null } })} />
              </Field>
              <Field label="Mode de transport"><Select value={p.preferences.travel_mode} onChange={(e) => setPref({ travel_mode: e.target.value })}>
                <option value="transit">Transports en commun</option><option value="car">Voiture</option><option value="auto">Transports puis voiture</option></Select></Field>
              <Field label="Rayon par défaut (km)"><Input type="number" value={p.preferences.radius_km} onChange={(e) => setPref({ radius_km: Number(e.target.value) })} /></Field>
              <Field label="Années d'expérience professionnelle" hint="Laissez vide si inconnu (considéré junior)"><Input type="number" step="0.5" value={p.preferences.experience_years ?? ""} onChange={(e) => setPref({ experience_years: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Salaire minimum (brut annuel, hors alternance)"><Input type="number" value={p.preferences.salary_min_annual ?? ""} onChange={(e) => setPref({ salary_min_annual: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="Disponibilité / rythme d'alternance"><Input value={p.preferences.rhythm} onChange={(e) => setPref({ rhythm: e.target.value })} placeholder="ex : 3 j entreprise / 2 j école" /></Field>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Compétences" action={<span className="text-xs text-muted">Pas de jauges de niveau : uniquement ce que vous maîtrisez réellement.</span>}>
        <div className="space-y-3">
          {Object.entries(SKILL_CATS).map(([cat, label]) => {
            const list = p.skills.filter((s) => s.category === cat);
            if (!list.length) return null;
            return (
              <div key={cat}>
                <div className="mb-1 text-xs font-medium text-muted">{label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((s) => (
                    <span key={s.name} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 py-0.5 pl-2.5 pr-1 text-xs">
                      {p.skill_notes?.[s.name] ?? s.name}
                      <button onClick={() => set({ skills: p.skills.filter((x) => x !== s) })} className="rounded-full p-0.5 text-muted hover:text-danger" aria-label={`Retirer ${s.name}`}><X className="size-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (newSkill.name.trim()) { set({ skills: [...p.skills, { name: newSkill.name.trim(), category: newSkill.category }] }); setNewSkill({ ...newSkill, name: "" }); } }}>
            <Input className="max-w-xs" placeholder="Nouvelle compétence" value={newSkill.name} onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })} />
            <Select className="w-44" value={newSkill.category} onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}>{Object.entries(SKILL_CATS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            <Button type="submit" icon={<Plus className="size-4" />}>Ajouter</Button>
          </form>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListEditor title="Expériences" items={p.experiences} onChange={(experiences) => set({ experiences })}
          hint="Décrivez vos missions réelles : l'IA ne fera que reformuler ce qui est écrit ici."
          blank={() => ({ id: uid("exp"), title: "", company: "", location: "", start: "", end: "", current: false, description: "", achievements: [], skills: [] })}
          render={(e, s) => (
            <div className="space-y-2">
              {e.to_complete && <Badge tone="warning">À compléter (intitulé, dates, missions)</Badge>}
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Intitulé du poste" value={e.title} onChange={(x) => s({ title: x.target.value, to_complete: false })} />
                <Input placeholder="Entreprise" value={e.company} onChange={(x) => s({ company: x.target.value })} />
                <Input placeholder="Début (ex : 09/2023)" value={e.start} onChange={(x) => s({ start: x.target.value })} />
                <Input placeholder="Fin" value={e.end} disabled={e.current} onChange={(x) => s({ end: x.target.value })} />
                <Input placeholder="Lieu" value={e.location} onChange={(x) => s({ location: x.target.value })} />
                <Toggle checked={e.current} onChange={(v) => s({ current: v })} label="Poste actuel" />
              </div>
              <Textarea rows={2} placeholder="Description" value={e.description} onChange={(x) => s({ description: x.target.value })} />
              <Textarea rows={3} placeholder="Missions / réalisations (une par ligne)" value={e.achievements.join("\n")} onChange={(x) => s({ achievements: x.target.value.split("\n") })} />
              <Input placeholder="Technologies utilisées (séparées par des virgules)" value={e.skills.join(", ")} onChange={(x) => s({ skills: x.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
            </div>
          )} />
        <div className="space-y-4">
          <ListEditor title="Formation" items={p.education} onChange={(education) => set({ education })}
            blank={() => ({ id: uid("edu"), degree: "", school: "", start: "", end: "", status: "obtained", level: 0, grade: "", details: "" })}
            render={(e, s) => (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input className="sm:col-span-2" placeholder="Diplôme" value={e.degree} onChange={(x) => s({ degree: x.target.value })} />
                <Input placeholder="École" value={e.school} onChange={(x) => s({ school: x.target.value })} />
                <Select value={e.status} onChange={(x) => s({ status: x.target.value })}><option value="obtained">Obtenu</option><option value="in_progress">En cours</option></Select>
                <Select value={e.level} onChange={(x) => s({ level: Number(x.target.value) })}><option value={0}>Niveau</option>{[2, 3, 4, 5, 8].map((l) => <option key={l} value={l}>Bac+{l}</option>)}</Select>
                <Input placeholder="Moyenne / mention" value={e.grade} onChange={(x) => s({ grade: x.target.value })} />
                <Input placeholder="Début" value={e.start} onChange={(x) => s({ start: x.target.value })} />
                <Input placeholder="Fin" value={e.end} onChange={(x) => s({ end: x.target.value })} />
                <Textarea className="sm:col-span-2" rows={2} placeholder="Détails" value={e.details} onChange={(x) => s({ details: x.target.value })} />
              </div>
            )} />
          <ListEditor title="Certifications" items={p.certifications} onChange={(certifications) => set({ certifications })}
            blank={() => ({ id: uid("cer"), name: "", issuer: "", date: "" })}
            render={(e, s) => (<div className="grid gap-2 sm:grid-cols-3"><Input placeholder="Nom" value={e.name} onChange={(x) => s({ name: x.target.value })} /><Input placeholder="Organisme" value={e.issuer} onChange={(x) => s({ issuer: x.target.value })} /><Input placeholder="Date" value={e.date} onChange={(x) => s({ date: x.target.value })} /></div>)} />
          <ListEditor title="Langues" items={p.languages} onChange={(languages) => set({ languages })} blank={() => ({ name: "", level: "" })}
            render={(e, s) => (<div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Langue" value={e.name} onChange={(x) => s({ name: x.target.value })} /><Input placeholder="Niveau (ex : B2, TOEIC 850)" value={e.level} onChange={(x) => s({ level: x.target.value })} /></div>)} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListEditor title="Projets" items={p.projects} onChange={(projects) => set({ projects })} blank={() => ({ id: uid("pro"), name: "", description: "", skills: [] })}
          hint="Projets d'école ou personnels (labs, homelab Proxmox, maquettes réseau…) : très utiles en alternance."
          render={(e, s) => (<div className="space-y-2"><Input placeholder="Nom" value={e.name} onChange={(x) => s({ name: x.target.value })} /><Textarea rows={2} placeholder="Description factuelle" value={e.description} onChange={(x) => s({ description: x.target.value })} /><Input placeholder="Technologies" value={e.skills.join(", ")} onChange={(x) => s({ skills: x.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} /></div>)} />
        <Card title="Centres d'intérêt">
          <Input placeholder="Séparés par des virgules" value={p.interests.join(", ")} onChange={(e) => set({ interests: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
        </Card>
      </div>

      <Modal open={!!imp} onClose={() => setImp(null)} title="Import du CV — éléments détectés" wide>
        {imp && (
          <div className="space-y-3">
            <Notice tone={imp.structured ? "neutral" : "warning"}>
              {imp.structured ? "Extraction réalisée par l'IA à partir de votre fichier. Choisissez ce que vous ajoutez au profil (rien n'est écrasé sans votre accord)." :
                `Extraction simplifiée (${imp.method}) : seules les coordonnées et les compétences reconnues sont proposées. Complétez le reste manuellement.`}
            </Notice>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries({ identity: "Coordonnées", summary: "Résumé", skills: "Compétences", experiences: "Expériences", education: "Formations", certifications: "Certifications", languages: "Langues", projects: "Projets" })
                .filter(([k]) => imp.structured || k === "identity" || k === "skills")
                .map(([k, l]) => {
                  const s = imp.structured as Record<string, unknown> | null;
                  const n = k === "skills" ? (imp.structured?.skills.length ?? imp.heuristic.skills_detected.length) : Array.isArray(s?.[k]) ? (s![k] as unknown[]).length : undefined;
                  return <Chip key={k} active={!!pick[k]} onClick={() => setPick({ ...pick, [k]: !pick[k] })}>{l}{n != null ? ` (${n})` : ""}</Chip>;
                })}
            </div>
            {imp.structured && imp.structured.experiences.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-xs">
                {imp.structured.experiences.map((e, i) => <li key={i}><b>{e.title}</b> — {e.company} ({e.start}–{e.end})</li>)}
              </ul>
            )}
            <div className="flex justify-end gap-2"><Button onClick={() => setImp(null)}>Annuler</Button><Button variant="primary" onClick={merge}>Ajouter au profil</Button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!revs} onClose={() => setRevs(null)} title="Historique du profil">
        <ul className="divide-y divide-border">
          {revs?.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>v{r.version} · {r.note} <span className="text-xs text-muted">{fmtDateTime(r.created_at)}</span></span>
              <Button size="sm" onClick={async () => { await api.post(`/api/profile/revisions/${r.id}/restore`); setRevs(null); load(); toast("Version restaurée", "success"); }}>Restaurer</Button>
            </li>
          ))}
          {revs?.length === 0 && <li className="py-2 text-sm text-muted">Aucune version antérieure.</li>}
        </ul>
      </Modal>
    </div>
  );
}
