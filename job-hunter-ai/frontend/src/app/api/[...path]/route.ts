// Relais /api/* -> backend FastAPI, lu à l'exécution (BACKEND_URL) : même origine pour le navigateur,
// cookie httpOnly transmis, aucune URL du backend figée au moment du build.
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function backend(): string {
  let u = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  if (!/^https?:\/\//.test(u)) u = `http://${u}`;
  return u.replace(/\/$/, "");
}

const HOP = ["host", "connection", "keep-alive", "transfer-encoding", "upgrade", "accept-encoding", "content-length"];

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = `${backend()}/api/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers = new Headers(req.headers);
  HOP.forEach((h) => headers.delete(h));
  headers.set("x-forwarded-host", req.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""));
  const init: RequestInit & { duplex?: "half" } = { method: req.method, headers, redirect: "manual", cache: "no-store" };
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = req.body;
    init.duplex = "half";
  }
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return Response.json({ detail: "Serveur API indisponible (démarrage en cours ?)" }, { status: 503 });
  }
  const out = new Headers(res.headers);
  ["content-encoding", "content-length", "transfer-encoding", "connection"].forEach((h) => out.delete(h));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
