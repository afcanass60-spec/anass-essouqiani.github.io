// Client API typé. Toutes les requêtes passent par le proxy Next (/api -> backend), cookie httpOnly.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
    window.location.href = "/login";
  }
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const data = await res.json();
      msg = typeof data.detail === "string" ? data.detail : Array.isArray(data.detail) ? data.detail.map((d: { msg: string }) => d.msg).join(", ") : msg;
    } catch {}
    throw new ApiError(res.status, msg);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}

export const api = {
  get: <T,>(p: string) => request<T>("GET", p),
  post: <T,>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
  put: <T,>(p: string, b: unknown) => request<T>("PUT", p, b),
  patch: <T,>(p: string, b: unknown) => request<T>("PATCH", p, b),
  del: <T,>(p: string) => request<T>("DELETE", p),
  upload: async <T,>(p: string, file: File): Promise<T> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(p, { method: "POST", body: fd, credentials: "same-origin" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new ApiError(res.status, d.detail || `Erreur ${res.status}`);
    }
    return res.json();
  },
};

// ---------- Types
export type Me = { id: number; email: string; full_name: string; role: string };

export type Offer = {
  id: number; title: string; company: string; company_type: string | null; sector: string | null;
  location: string; city: string | null; work_mode: string | null; contracts: string[]; contract_labels: string[];
  salary: { min_annual: number | null; max_annual: number | null; label: string | null; monthly_gross: number | null; monthly_net_estimate: number | null; estimated: boolean };
  published_at: string | null; first_seen_at: string | null; sources: string[]; score: number | null; score_category: string | null;
  score_method: string | null; skills: string[]; url: string | null; status: string; is_active: boolean; closed_reason: string | null;
  is_urgent: boolean; republished_count: number; needs_details: boolean; travel_minutes: number | null; travel_mode: string | null;
  distance_km: number | null; education_level: number | null; experience_years: number | null; beginner_ok: boolean | null;
  explanation: string | null;
};

export type Criterion = { label: string; points: number; max: number; notes: string[]; ai_points?: number; ai_justification?: string };
export type ScoreDetails = {
  score: number; category: string; explanation: string; breakdown: Record<string, Criterion>;
  skills: { required: string[]; desired: string[]; matched_required: string[]; matched_desired: string[]; transferable: string[]; missing_required: string[]; missing_desired: string[] };
  blockers: string[]; injection_suspected: boolean; warnings?: string[]; ai_error?: string;
  ai: null | { summary: string; strengths: string[]; gaps: string[]; required_skills: string[]; nice_to_have_skills: string[]; verified_matching_skills: string[]; unverified_claims_removed: string[]; red_flags: string[] };
};
export type OfferDetail = Offer & {
  description: string; score_details: ScoreDetails; skills_required: string[]; skills_desired: string[];
  license_required: boolean | null; english_required: boolean | null; start_date: string | null; travel_source: string | null;
  injection_flag: boolean; source_links: { source: string; url: string | null; first_seen_at: string; last_seen_at: string }[];
};

export type Run = { id: number; search_id: number | null; trigger: string; status: string; started_at: string; finished_at: string | null;
  stats: Record<string, number | Record<string, number>>; errors: { source: string; error: string; type: string }[]; report: string };

export type Scheduler = { active: boolean; last_beat: string | null; message: string };

export type Application = {
  id: number; offer_id: number | null; company: string; title: string; url: string | null; status: string;
  applied_at: string | null; next_action_at: string | null; updated_at: string; created_at: string; validated: boolean;
  contacts_count: number; documents_count: number;
};
export type ApplicationDetail = Application & {
  contacts: Contact[]; notes: string;
  events: { id: number; kind: string; payload: Record<string, unknown>; created_at: string }[];
  documents: { id: number; kind: string; title: string; created_at: string; has_pdf: boolean; has_docx: boolean; content: Record<string, unknown> }[];
};
export type Contact = { name?: string; role?: string; email?: string; phone?: string; linkedin?: string; notes?: string };

export type CVContent = {
  identity: Record<string, string>; headline: string; summary: string; sections_order: string[]; hidden: string[];
  skills_groups: { label: string; items: string[] }[];
  experiences: { ref_id: string; title: string; company: string; location: string; start: string; end: string; bullets: string[] }[];
  education: { ref_id: string; degree: string; school: string; start: string; end: string; details: string }[];
  projects: { ref_id: string; name: string; description: string; skills: string[] }[];
  certifications: { ref_id: string; name: string; issuer: string; date: string }[];
  languages: string[]; interests: string[]; keywords: string[];
};
export type CV = { id: number; name: string; template: string; theme: Record<string, string | number>; origin: string; revision: number; target_offer_id: number | null; updated_at: string; content?: CVContent };

export type Letter = { id: number; offer_id: number | null; kind: string; style: string; title: string; body: string; generated_by: string; analysis: LetterAnalysis | Record<string, never>; updated_at: string };
export type LetterAnalysis = { scores: Record<string, number>; global: number; issues: string[]; strengths: string[]; generic_phrases: string[]; word_count: number; disclaimer: string };

export type AtsAnalysis = { match_score: number | null; ats_readability: number; skills_found: string[]; skills_missing: string[]; keywords_to_add: string[];
  not_in_profile: string[]; strengths: string[]; improvements: string[]; risks: string[]; word_count: number; disclaimer: string };

export type Company = { id: number; name: string; sector: string; company_type: string; careers_url: string | null; ats_provider: string | null;
  ats_slug: string | null; is_favorite: boolean; watch: boolean; last_checked_at: string | null; last_check_status: string | null; notes: string; offers_count: number };

export type SavedSearch = { id: number; name: string; keywords: string[]; sources: string[]; params: Record<string, unknown>; frequency: string; enabled: boolean; next_run_at: string | null; last_run_at: string | null };

export type Source = { key: string; label: string; kind: string; official: boolean; configured: boolean; supported: boolean; required_env: string[]; docs_url?: string; notes?: string; reason?: string; alternative?: string };

export type Profile = {
  identity: Record<string, string | boolean | null>; summary: string;
  education: { id: string; degree: string; school: string; start: string; end: string; status: string; level: number; grade: string; details: string }[];
  experiences: { id: string; title: string; company: string; location: string; start: string; end: string; current: boolean; description: string; achievements: string[]; skills: string[]; to_complete?: boolean }[];
  skills: { name: string; category: string }[]; skill_notes: Record<string, string>;
  certifications: { id: string; name: string; issuer: string; date: string }[]; languages: { name: string; level: string }[];
  projects: { id: string; name: string; description: string; skills: string[] }[]; interests: string[];
  preferences: { contracts: string[]; contract_priority?: string[]; locations: string[]; radius_km: number; home: { label: string; lat: number | null; lon: number | null };
    travel_mode: string; max_travel_minutes: number; domains: string[]; salary_min_annual: number | null; work_modes: string[]; experience_years: number | null; available_from: string; rhythm: string };
};
