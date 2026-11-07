import { NextResponse } from "next/server";
import { getProvider } from "@/server/ai/provider";
import { supabaseServerConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Indique au client si l'IA est réellement connectée (sans exposer de secret). */
export async function GET() {
  const p = getProvider();
  return NextResponse.json({
    configured: !!p,
    provider: p?.name ?? null,
    model: p?.model ?? null,
    requiresAuth: supabaseServerConfigured && process.env.AI_ALLOW_ANONYMOUS !== "true",
  });
}
