import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/* =========================================================
   Couche d'accès aux modèles IA (côté serveur uniquement).
   Les clés ne quittent jamais le serveur. Deux fournisseurs :
   - "anthropic"          : API Claude (SDK officiel)
   - "openai-compatible"  : toute API compatible /chat/completions
                            (OpenAI, Mistral, Groq, OpenRouter, Ollama local…)
   ========================================================= */

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIRequest {
  system: string;
  messages: AIMessage[];
  /** Schéma JSON attendu pour la réponse (sortie structurée). */
  schema: Record<string, unknown>;
  maxTokens?: number;
}

export interface AIProvider {
  name: string;
  model: string;
  completeJSON(req: AIRequest): Promise<unknown>;
}

export class AIUnavailableError extends Error {}
export class AIResponseError extends Error {}

function parseJSON(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new AIResponseError("Réponse IA illisible (JSON invalide).");
  }
}

class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private client: Anthropic;
  constructor(
    apiKey: string,
    public model: string,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 });
  }

  async completeJSON(req: AIRequest): Promise<unknown> {
    try {
      const response = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 4000,
        system: req.system,
        messages: req.messages,
        // Effort bas : réponses de tutorat rapides et économiques.
        output_config: { effort: "low", format: { type: "json_schema", schema: req.schema } },
        // Repli automatique côté serveur si le modèle principal décline une requête.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      if (response.stop_reason === "refusal") throw new AIResponseError("La requête a été refusée par le modèle.");
      const text = response.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      if (!text) throw new AIResponseError("Réponse IA vide.");
      return parseJSON(text);
    } catch (e) {
      if (e instanceof AIResponseError) throw e;
      if (e instanceof Anthropic.AuthenticationError) throw new AIUnavailableError("Clé API IA invalide.");
      if (e instanceof Anthropic.RateLimitError) throw new AIResponseError("Limite de requêtes IA atteinte, réessayez dans un instant.");
      if (e instanceof Anthropic.APIError) throw new AIResponseError(`Erreur du fournisseur IA (${e.status}).`);
      throw new AIResponseError("Impossible de joindre le fournisseur IA.");
    }
  }
}

class OpenAICompatibleProvider implements AIProvider {
  name = "openai-compatible";
  constructor(
    private baseUrl: string,
    private apiKey: string | undefined,
    public model: string,
  ) {}

  async completeJSON(req: AIRequest): Promise<unknown> {
    const system = `${req.system}\n\nRespond ONLY with a JSON object matching this JSON schema:\n${JSON.stringify(req.schema)}`;
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}) },
        body: JSON.stringify({
          model: this.model,
          max_tokens: req.maxTokens ?? 4000,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, ...req.messages],
        }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch {
      throw new AIResponseError("Impossible de joindre le fournisseur IA.");
    }
    if (res.status === 401 || res.status === 403) throw new AIUnavailableError("Clé API IA invalide.");
    if (!res.ok) throw new AIResponseError(`Erreur du fournisseur IA (${res.status}).`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new AIResponseError("Réponse IA vide.");
    return parseJSON(text);
  }
}

let cached: AIProvider | null | undefined;

export function getProvider(): AIProvider | null {
  if (cached !== undefined) return cached;
  const kind = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  if (kind === "openai-compatible") {
    const base = process.env.AI_BASE_URL;
    const model = process.env.AI_MODEL;
    cached = base && model ? new OpenAICompatibleProvider(base, process.env.AI_API_KEY, model) : null;
  } else {
    const key = process.env.ANTHROPIC_API_KEY ?? process.env.AI_API_KEY;
    cached = key ? new AnthropicProvider(key, process.env.AI_MODEL ?? "claude-opus-5-5") : null;
  }
  return cached;
}

/** Réservé aux tests : injecte un fournisseur factice. */
export function __setProviderForTests(p: AIProvider | null) {
  cached = p;
}
