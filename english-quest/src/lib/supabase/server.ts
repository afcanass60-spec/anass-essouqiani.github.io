import { createClient, type User } from "@supabase/supabase-js";

/* Vérification côté serveur du jeton d'accès envoyé par le navigateur
   (en-tête Authorization: Bearer <access_token>). */

export const supabaseServerConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function getUserFromRequest(req: Request): Promise<User | null> {
  if (!supabaseServerConfigured) return null;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}
