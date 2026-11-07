import { NextResponse } from "next/server";
import { AIResponseError, AIUnavailableError, getProvider } from "@/server/ai/provider";
import { TASKS, isTaskName } from "@/server/ai/tasks";
import { identify, rateLimit } from "@/server/ai/guard";
import { normalizeOutput } from "@/server/ai/normalize";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request, ctx: { params: Promise<{ task: string }> }) {
  const { task } = await ctx.params;
  if (!isTaskName(task)) return NextResponse.json({ error: "Tâche IA inconnue." }, { status: 404 });

  const provider = getProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "Aucun fournisseur IA n'est configuré sur le serveur.", code: "ai_not_configured" },
      { status: 503 },
    );
  }

  const who = await identify(req);
  if (!who.ok) return NextResponse.json({ error: who.error, code: who.code }, { status: who.status });
  if (!rateLimit(who.key)) {
    return NextResponse.json({ error: "Trop de requêtes. Patientez une minute.", code: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }
  const def = TASKS[task];
  const parsed = def.input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides.", details: parsed.error.issues.slice(0, 5) }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await def.run(provider, parsed.data as any);
    return NextResponse.json(normalizeOutput(task, raw));
  } catch (e) {
    if (e instanceof AIUnavailableError) return NextResponse.json({ error: e.message, code: "ai_unavailable" }, { status: 503 });
    if (e instanceof AIResponseError) return NextResponse.json({ error: e.message, code: "ai_error" }, { status: 502 });
    console.error("[ai]", task, e);
    return NextResponse.json({ error: "Erreur interne lors de l'appel IA.", code: "ai_error" }, { status: 500 });
  }
}
