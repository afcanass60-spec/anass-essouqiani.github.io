export const CONTRACTS = [
  { key: "alternance", label: "Alternance" },
  { key: "apprentissage", label: "Apprentissage" },
  { key: "professionnalisation", label: "Contrat pro" },
  { key: "cdi", label: "CDI" },
  { key: "cdd", label: "CDD" },
  { key: "stage", label: "Stage" },
];

export const LOCATIONS = ["Paris", "Île-de-France", "Oise", "Creil", "Chantilly", "Senlis", "Compiègne", "Roissy-en-France",
  "Saint-Denis", "La Défense", "Boulogne-Billancourt", "Nanterre", "Versailles"];

export const COMPANY_TYPES: Record<string, string> = { grand_groupe: "Grand groupe", pme: "PME", esn: "ESN", public: "Secteur public", startup: "Start-up" };

export const SOURCE_LABELS: Record<string, string> = {
  france_travail: "France Travail", la_bonne_alternance: "La Bonne Alternance", adzuna: "Adzuna", google_cse: "Google",
  email_alerts: "Alertes email", linkedin: "LinkedIn (alerte)", indeed: "Indeed (alerte)", welcome_to_the_jungle: "WTTJ (alerte)",
  apec: "Apec (alerte)", hellowork: "HelloWork (alerte)", jobteaser: "JobTeaser (alerte)", meteojob: "Meteojob (alerte)",
  chooseyourboss: "ChooseYourBoss (alerte)", greenhouse: "Greenhouse", lever: "Lever", smartrecruiters: "SmartRecruiters",
  recruitee: "Recruitee", ashby: "Ashby", career_page: "Page carrière", manual: "Import manuel", manual_url: "Import URL",
};

export const APP_STATUSES: { key: string; label: string; tone: string }[] = [
  { key: "a_analyser", label: "À analyser", tone: "neutral" },
  { key: "a_postuler", label: "À postuler", tone: "accent" },
  { key: "envoyee", label: "Candidature envoyée", tone: "accent" },
  { key: "relance", label: "Relance nécessaire", tone: "warning" },
  { key: "entretien_rh", label: "Entretien RH", tone: "success" },
  { key: "entretien_technique", label: "Entretien technique", tone: "success" },
  { key: "en_attente", label: "En attente", tone: "neutral" },
  { key: "refus", label: "Refus", tone: "danger" },
  { key: "accepte", label: "Accepté", tone: "success" },
];
export const statusLabel = (k: string) => APP_STATUSES.find((s) => s.key === k)?.label ?? k;

export function relDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

export function salaryText(s: { min_annual: number | null; max_annual: number | null; label: string | null; estimated: boolean }): string {
  if (!s.min_annual && !s.max_annual) return "Salaire non communiqué";
  const k = (v: number) => `${Math.round(v / 1000)} k€`;
  const range = s.min_annual && s.max_annual && s.min_annual !== s.max_annual ? `${k(s.min_annual)}–${k(s.max_annual)}` : k((s.max_annual || s.min_annual)!);
  return `${range} brut/an${s.estimated ? " (estimé)" : ""}`;
}

export function scoreTone(score: number | null): "success" | "accent" | "warning" | "neutral" | "danger" {
  if (score == null) return "neutral";
  if (score >= 90) return "success";
  if (score >= 80) return "accent";
  if (score >= 70) return "accent";
  if (score >= 60) return "warning";
  return "danger";
}
