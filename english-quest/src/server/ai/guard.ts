import "server-only";
import { getUserFromRequest, supabaseServerConfigured } from "@/lib/supabase/server";

/* Protection des routes IA : authentification (si Supabase est configuré)
   et limitation de débit en mémoire par utilisateur / adresse IP. */

const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 20)): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export async function identify(req: Request): Promise<{ ok: true; key: string } | { ok: false; status: number; error: string; code: string }> {
  const allowAnonymous = process.env.AI_ALLOW_ANONYMOUS === "true" || !supabaseServerConfigured;
  const user = await getUserFromRequest(req);
  if (!user && !allowAnonymous) {
    return { ok: false, status: 401, error: "Connectez-vous pour utiliser les fonctionnalités IA.", code: "auth_required" };
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return { ok: true, key: user ? `u:${user.id}` : `ip:${ip}` };
}
