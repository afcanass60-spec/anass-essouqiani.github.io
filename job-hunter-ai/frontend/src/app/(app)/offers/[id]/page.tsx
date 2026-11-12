"use client";

import { AlertTriangle, ArrowLeft, Bookmark, CheckCircle2, ExternalLink, EyeOff, Info, ShieldAlert, Sparkles, Wand2, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/toast";
import { Badge, Bar, Button, Card, Field, Input, Notice, ScoreRing, Spinner, Textarea } from "@/components/ui";
import { api, OfferDetail } from "@/lib/api";
import { COMPANY_TYPES, fmtDate, relDate, salaryText, SOURCE_LABELS } from "@/lib/format";

function SkillList({ title, items, tone, icon }: { title: string; items: string[]; tone: "success" | "danger" | "warning" | "neutral"; icon: React.ReactNode }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">{icon}{title}</div>
      <div className="flex flex-wrap gap-1">{items.map((s) => <Badge key={s} tone={tone}>{s}</Badge>)}</div>
    </div>
  );
}

export default function OfferPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [o, setO] = useState<OfferDetail | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [complete, setComplete] = useState({ description: "", company: "", location: "" });
  const load = useCallback(() => api.get<OfferDetail>(`/api/offers/${id}`).then(setO).catch((e) => toast(e.message, "error")), [id, toast]);
  useEffect(() => { load(); }, [load]);
  if (!o) return <Spinner />;
  const d = o.score_details;

  async function analyze() {
    setAnalyzing(true);
    try { setO(await api.post<OfferDetail>(`/api/offers/${id}/analyze`)); toast("Analyse mise à jour", "success"); }
    catch (e) { toast((e as Error).message, "error"); } finally { setAnalyzing(false); }
  }
  async function status(s: string) { await api.patch(`/api/offers/${id}/status`, { status: s }); load(); }
  async function apply() {
    const a = await api.post<{ id: number }>(`/api/applications/from-offer/${id}`);
    router.push(`/studio/prepare/${id}?application=${a.id}`);
  }
  async function submitComplete() {
    try { setO(await api.post<OfferDetail>(`/api/offers/${id}/complete`, { ...complete, title: o!.title })); toast("Annonce complétée et réévaluée", "success"); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <div className="space-y-5">
      <Link href="/offers" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft className="size-4" />Offres</Link>
      <div className="flex flex-wrap items-start gap-4">
        <ScoreRing score={o.score} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <span className="font-medium text-text">{o.company || "Entreprise non précisée"}</span>
            {o.company_type && <Badge>{COMPANY_TYPES[o.company_type]}</Badge>}
            {o.sector === "public" && <Badge>Secteur public</Badge>}
            {o.is_urgent && <Badge tone="danger">Urgent</Badge>}
            {!o.is_active && <Badge tone="danger">{o.closed_reason}</Badge>}
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{o.title}</h1>
          <p className="mt-1 text-sm text-muted">{o.location} · {o.contract_labels.join(" · ") || "Contrat non précisé"} · {salaryText(o.salary)} · publiée {relDate(o.published_at || o.first_seen_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {o.url && <a href={o.url} target="_blank" rel="noopener noreferrer nofollow"><Button icon={<ExternalLink className="size-4" />}>Voir l&apos;annonce</Button></a>}
          <Button icon={<Bookmark className="size-4" />} onClick={() => status(o.status === "saved" ? "new" : "saved")}>{o.status === "saved" ? "Sauvegardée" : "Sauvegarder"}</Button>
          <Button icon={<EyeOff className="size-4" />} onClick={() => status("ignored")}>Ignorer</Button>
          <Button variant="primary" icon={<Wand2 className="size-4" />} onClick={apply}>Préparer ma candidature</Button>
        </div>
      </div>

      {o.injection_flag && <Notice tone="warning" className="flex gap-2"><ShieldAlert className="size-4 shrink-0" />Cette annonce contient des instructions suspectes destinées à une IA : elles ont été ignorées et n&apos;ont pas influencé le score.</Notice>}
      {o.needs_details && (
        <Card title="Piste à compléter">
          <p className="mb-3 text-sm text-muted">Cette piste provient d&apos;une alerte email ou d&apos;une recherche Google : la source n&apos;autorise pas la collecte automatique. Collez le texte de l&apos;annonce pour obtenir une analyse complète.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Entreprise"><Input value={complete.company} onChange={(e) => setComplete({ ...complete, company: e.target.value })} placeholder={o.company} /></Field>
            <Field label="Lieu"><Input value={complete.location} onChange={(e) => setComplete({ ...complete, location: e.target.value })} placeholder={o.location} /></Field>
          </div>
          <Textarea className="mt-3" rows={6} placeholder="Description complète de l'annonce…" value={complete.description} onChange={(e) => setComplete({ ...complete, description: e.target.value })} />
          <Button className="mt-3" variant="primary" onClick={submitComplete} disabled={!complete.description}>Compléter et analyser</Button>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Analyse d'adéquation" action={<Button size="sm" loading={analyzing} icon={<Sparkles className="size-3.5" />} onClick={analyze}>Analyser avec l&apos;IA</Button>}>
            <p className="text-sm leading-relaxed">{d.explanation}</p>
            {d.ai_error && <Notice className="mt-3" tone="warning">Analyse IA indisponible : {d.ai_error}. Score calculé par les règles déterministes.</Notice>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(d.breakdown).map(([k, c]) => (
                <div key={k} className="rounded-lg border border-border p-3">
                  <div className="mb-1.5 flex items-center justify-between text-sm"><span className="font-medium">{c.label}</span><span className="tabular-nums text-muted">{c.points}/{c.max}</span></div>
                  <Bar value={c.points} max={c.max} tone={c.points / c.max >= 0.75 ? "success" : c.points / c.max >= 0.5 ? "accent" : c.points / c.max >= 0.3 ? "warning" : "danger"} />
                  <ul className="mt-2 space-y-1 text-xs text-muted">{c.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                  {c.ai_justification && <p className="mt-2 border-t border-border pt-2 text-xs"><span className="font-medium">IA ({c.ai_points}) :</span> {c.ai_justification}</p>}
                </div>
              ))}
            </div>
          </Card>
          <Card title="Description de l'annonce">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{o.description || "—"}</div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Compétences">
            <div className="space-y-3">
              <SkillList title="Indispensables couvertes" items={d.skills.matched_required} tone="success" icon={<CheckCircle2 className="size-3.5" />} />
              <SkillList title="Souhaitées couvertes" items={d.skills.matched_desired} tone="success" icon={<CheckCircle2 className="size-3.5" />} />
              <SkillList title="Transférables (proches de votre parcours)" items={d.skills.transferable} tone="warning" icon={<Info className="size-3.5" />} />
              <SkillList title="Indispensables manquantes" items={d.skills.missing_required} tone="danger" icon={<XCircle className="size-3.5" />} />
              <SkillList title="Souhaitées manquantes" items={d.skills.missing_desired} tone="neutral" icon={<Info className="size-3.5" />} />
              {!d.skills.required.length && !d.skills.desired.length && <p className="text-sm text-muted">Aucune compétence technique identifiée.</p>}
            </div>
          </Card>
          {d.blockers.length > 0 && (
            <Card title={<span className="flex items-center gap-1.5"><AlertTriangle className="size-4 text-warning" />Points bloquants possibles</span>}>
              <ul className="list-disc space-y-1 pl-4 text-sm">{d.blockers.map((b) => <li key={b}>{b}</li>)}</ul>
            </Card>
          )}
          {d.ai && (
            <Card title="Lecture IA">
              <div className="space-y-3 text-sm">
                {d.ai.strengths.length > 0 && <div><div className="mb-1 text-xs font-medium text-muted">Points forts</div><ul className="list-disc space-y-1 pl-4">{d.ai.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                {d.ai.gaps.length > 0 && <div><div className="mb-1 text-xs font-medium text-muted">Écarts</div><ul className="list-disc space-y-1 pl-4">{d.ai.gaps.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                {d.ai.red_flags.length > 0 && <div><div className="mb-1 text-xs font-medium text-muted">Vigilance</div><ul className="list-disc space-y-1 pl-4">{d.ai.red_flags.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                {d.ai.unverified_claims_removed.length > 0 && <Notice tone="warning">Affirmations IA écartées (absentes de votre profil) : {d.ai.unverified_claims_removed.join(", ")}</Notice>}
              </div>
            </Card>
          )}
          <Card title="Détails">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Niveau</dt><dd>{o.education_level ? `Bac+${o.education_level}` : "—"}</dd>
              <dt className="text-muted">Expérience</dt><dd>{o.beginner_ok ? "Débutant accepté" : o.experience_years != null ? `${o.experience_years} an(s)` : "—"}</dd>
              <dt className="text-muted">Mode</dt><dd>{{ remote: "Télétravail", hybrid: "Hybride", onsite: "Sur site" }[o.work_mode ?? ""] ?? "Non précisé"}</dd>
              <dt className="text-muted">Trajet</dt><dd>{o.travel_minutes != null ? `${o.travel_minutes} min` : o.distance_km != null ? `≈ ${Math.round(o.distance_km)} km (distance)` : "Non calculé"}</dd>
              <dt className="text-muted">Début</dt><dd>{fmtDate(o.start_date)}</dd>
              <dt className="text-muted">Permis</dt><dd>{o.license_required ? "Exigé" : "Non mentionné"}</dd>
              <dt className="text-muted">Anglais</dt><dd>{o.english_required ? "Exigé" : o.english_required === false ? "Souhaité / technique" : "Non mentionné"}</dd>
              <dt className="text-muted">Net estimé</dt><dd>{o.salary.monthly_net_estimate ? `≈ ${o.salary.monthly_net_estimate} €/mois` : "—"}</dd>
            </dl>
          </Card>
          <Card title={`Publications (${o.source_links.length})`}>
            <ul className="space-y-2 text-sm">
              {o.source_links.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span>{SOURCE_LABELS[s.source] ?? s.source}<span className="block text-xs text-muted">vue {relDate(s.first_seen_at)}</span></span>
                  {s.url && <a className="text-xs text-accent" href={s.url} target="_blank" rel="noopener noreferrer nofollow">Ouvrir</a>}
                </li>
              ))}
            </ul>
            {o.republished_count > 0 && <p className="mt-2 text-xs text-warning">Republiée {o.republished_count} fois.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
