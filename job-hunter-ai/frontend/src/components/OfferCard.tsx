"use client";

import { Bookmark, BookmarkCheck, Briefcase, Clock, EyeOff, ExternalLink, FileText, MapPin, Repeat, Sparkles, Train, Wand2 } from "lucide-react";
import Link from "next/link";

import { Offer } from "@/lib/api";
import { COMPANY_TYPES, relDate, salaryText, SOURCE_LABELS } from "@/lib/format";
import { Badge, Button, ScoreRing } from "./ui";

export function OfferRow({ offer }: { offer: Offer }) {
  return (
    <Link href={`/offers/${offer.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
      <ScoreRing score={offer.score} size={38} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{offer.title}</div>
        <div className="truncate text-xs text-muted">{offer.company || "Entreprise non précisée"} · {offer.location || "—"}</div>
      </div>
      <div className="hidden gap-1 sm:flex">{offer.contract_labels.slice(0, 2).map((c) => <Badge key={c}>{c}</Badge>)}</div>
    </Link>
  );
}

export function OfferCard({ offer, onStatus, onApply, busy }: {
  offer: Offer;
  onStatus: (status: string) => void;
  onApply: () => void;
  busy?: boolean;
}) {
  const saved = offer.status === "saved";
  return (
    <article className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/40">
      <div className="flex items-start gap-3">
        <ScoreRing score={offer.score} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="font-medium text-text">{offer.company || "Entreprise non précisée"}</span>
            {offer.company_type && <Badge>{COMPANY_TYPES[offer.company_type] ?? offer.company_type}</Badge>}
            {offer.is_urgent && <Badge tone="danger">Urgent</Badge>}
            {offer.needs_details && <Badge tone="warning">Piste à compléter</Badge>}
            {offer.republished_count > 0 && <Badge tone="warning"><Repeat className="size-3" />Republiée</Badge>}
            {!offer.is_active && <Badge tone="danger">{offer.closed_reason || "Expirée"}</Badge>}
          </div>
          <Link href={`/offers/${offer.id}`} className="mt-0.5 block text-[15px] font-semibold leading-snug hover:text-accent">{offer.title}</Link>
          {offer.score_category && <div className="mt-0.5 text-xs text-muted">{offer.score_category}{offer.score_method === "hybrid" && " · analyse IA"}</div>}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{offer.location || "Lieu non précisé"}{offer.work_mode === "remote" ? " · Télétravail" : offer.work_mode === "hybrid" ? " · Hybride" : ""}</span>
        {offer.travel_minutes != null ? (
          <span className="inline-flex items-center gap-1"><Train className="size-3.5" />{offer.travel_minutes} min ({offer.travel_mode === "car" ? "voiture" : "transports"})</span>
        ) : offer.distance_km != null ? (
          <span className="inline-flex items-center gap-1" title="Distance à vol d'oiseau, pas un temps de trajet"><MapPin className="size-3.5" />≈ {Math.round(offer.distance_km)} km</span>
        ) : null}
        <span className="inline-flex items-center gap-1"><Briefcase className="size-3.5" />{offer.contract_labels.join(" · ") || "Contrat non précisé"}</span>
        <span>{salaryText(offer.salary)}</span>
        <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{relDate(offer.published_at || offer.first_seen_at)}</span>
      </div>

      {offer.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">{offer.skills.slice(0, 8).map((s) => <Badge key={s}>{s}</Badge>)}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex flex-wrap gap-1">
          {offer.sources.map((s) => <span key={s} className="text-[11px] text-muted">{SOURCE_LABELS[s] ?? s}</span>).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, <span key={`d${i}`} className="text-[11px] text-muted">·</span>, el] : [el]), [])}
        </div>
        <div className="flex flex-wrap gap-1">
          {offer.url && <a href={offer.url} target="_blank" rel="noopener noreferrer nofollow"><Button size="sm" variant="ghost" icon={<ExternalLink className="size-3.5" />}>Voir l&apos;annonce</Button></a>}
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onStatus(saved ? "new" : "saved")} icon={saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}>{saved ? "Sauvegardée" : "Sauvegarder"}</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onStatus(offer.status === "ignored" ? "new" : "ignored")} icon={<EyeOff className="size-3.5" />}>{offer.status === "ignored" ? "Restaurer" : "Ignorer"}</Button>
          <Link href={`/offers/${offer.id}`}><Button size="sm" variant="ghost" icon={<Sparkles className="size-3.5" />}>Analyser</Button></Link>
          <Link href={`/studio/prepare/${offer.id}`}><Button size="sm" variant="ghost" icon={<FileText className="size-3.5" />}>Lettre</Button></Link>
          <Button size="sm" variant="primary" disabled={busy} onClick={onApply} icon={<Wand2 className="size-3.5" />}>Candidater</Button>
        </div>
      </div>
    </article>
  );
}
