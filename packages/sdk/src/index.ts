export interface PromptClientOptions {
  apiKey: string;
  baseUrl?: string;
}

export interface PromptResult {
  id: string;
  slug: string;
  name: string;
  content: string;
  versionTag: string;
  versionNumber: number;
  variables: string[];
  model?: string;
  systemPrompt?: string;
}

export interface TrackOptions {
  promptVersionId: string;
  latencyMs?: number;
  tokenCount?: number;
  promptTokens?: number;
  completionTokens?: number;
  rating?: 1 | 2 | 3 | 4 | 5;
  metadata?: Record<string, unknown>;
}

export interface TrackAutoOverrides {
  rating?: 1 | 2 | 3 | 4 | 5;
  metadata?: Record<string, unknown>;
}

export interface RunResult<T> {
  /** The raw LLM response object */
  response: T;
  /** Automatically extracted token counts */
  tokenCount: number;
  promptTokens: number;
  completionTokens: number;
  /** Time from LLM call start to finish in milliseconds */
  latencyMs: number;
  /** Auto-computed 1–5 rating based on latency + token efficiency */
  autoRating: 1 | 2 | 3 | 4 | 5;
}

export interface GetOptions {
  version?: string;
  environment?: "development" | "staging" | "production";
}

export interface ExperimentVariantResult {
  variantId: string;
  variantName: string;
  isControl: boolean;
  prompt: {
    id: string;
    content: string;
    versionTag: string;
    variables: string[];
  };
}

// ─── Token Extraction ─────────────────────────────────────────────────────────

export interface ExtractedTokens {
  tokenCount: number;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Extract token counts from any major LLM provider's response object.
 * Supports OpenAI, Azure OpenAI, Anthropic, Google Gemini, and raw objects.
 */
export function extractTokens(response: unknown): ExtractedTokens {
  if (!response || typeof response !== "object") {
    return { tokenCount: 0, promptTokens: 0, completionTokens: 0 };
  }

  const r = response as Record<string, unknown>;

  // OpenAI / Azure OpenAI: { usage: { total_tokens, prompt_tokens, completion_tokens } }
  if (r.usage && typeof r.usage === "object") {
    const u = r.usage as Record<string, unknown>;
    if (typeof u.total_tokens === "number") {
      return {
        tokenCount: u.total_tokens,
        promptTokens: (u.prompt_tokens as number) || 0,
        completionTokens: (u.completion_tokens as number) || 0,
      };
    }
    // Anthropic: { usage: { input_tokens, output_tokens } }
    if (typeof u.input_tokens === "number") {
      const input = u.input_tokens as number;
      const output = (u.output_tokens as number) || 0;
      return { tokenCount: input + output, promptTokens: input, completionTokens: output };
    }
  }

  // Google Gemini: { usageMetadata: { totalTokenCount, promptTokenCount, candidatesTokenCount } }
  if (r.usageMetadata && typeof r.usageMetadata === "object") {
    const m = r.usageMetadata as Record<string, unknown>;
    if (typeof m.totalTokenCount === "number") {
      return {
        tokenCount: m.totalTokenCount,
        promptTokens: (m.promptTokenCount as number) || 0,
        completionTokens: (m.candidatesTokenCount as number) || 0,
      };
    }
  }

  // Raw / custom: { tokenCount, tokens, totalTokens, total_tokens }
  const rawTotal =
    (r.tokenCount as number) ||
    (r.tokens as number) ||
    (r.totalTokens as number) ||
    (r.total_tokens as number) ||
    0;

  return {
    tokenCount: rawTotal,
    promptTokens: (r.promptTokens as number) || (r.prompt_tokens as number) || 0,
    completionTokens: (r.completionTokens as number) || (r.completion_tokens as number) || 0,
  };
}

// ─── Auto-Rating Algorithm ────────────────────────────────────────────────────

/**
 * Compute an automatic 1–5 quality rating from latency and token efficiency.
 *
 * Latency score (50%):
 *   < 200ms → 5 | 200–500ms → 4 | 500–1000ms → 3 | 1000–2000ms → 2 | > 2000ms → 1
 *
 * Efficiency score (50%) — tokens per second:
 *   > 100 t/s → 5 | 50–100 → 4 | 25–50 → 3 | 10–25 → 2 | < 10 → 1
 */
export function computeAutoRating(latencyMs: number, tokenCount: number): 1 | 2 | 3 | 4 | 5 {
  // Latency score
  let latencyScore: number;
  if (latencyMs < 200) latencyScore = 5;
  else if (latencyMs < 500) latencyScore = 4;
  else if (latencyMs < 1000) latencyScore = 3;
  else if (latencyMs < 2000) latencyScore = 2;
  else latencyScore = 1;

  // Efficiency score (tokens/sec)
  let efficiencyScore: number;
  if (latencyMs === 0 || tokenCount === 0) {
    efficiencyScore = latencyScore; // No token data: rely purely on latency
  } else {
    const tokensPerSec = (tokenCount / latencyMs) * 1000;
    if (tokensPerSec > 100) efficiencyScore = 5;
    else if (tokensPerSec > 50) efficiencyScore = 4;
    else if (tokensPerSec > 25) efficiencyScore = 3;
    else if (tokensPerSec > 10) efficiencyScore = 2;
    else efficiencyScore = 1;
  }

  const raw = Math.round((latencyScore + efficiencyScore) / 2);
  return Math.max(1, Math.min(5, raw)) as 1 | 2 | 3 | 4 | 5;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class PromptClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: PromptClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api.promptvcs.dev";
  }

  /**
   * Fetch a prompt by its slug.
   */
  async get(slug: string, options?: GetOptions): Promise<PromptResult> {
    const params = new URLSearchParams();
    if (options?.environment) params.set("environment", options.environment);
    if (options?.version) params.set("version", options.version);

    const url = `${this.baseUrl}/api/sdk/prompts/${slug}${params.size ? `?${params}` : ""}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`PromptVCS: ${error.error || "Failed to fetch prompt"}`);
    }
    return res.json();
  }

  /**
   * Format a prompt by replacing {{variable}} placeholders.
   */
  format(content: string, variables: Record<string, string>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  }

  /**
   * Manually track metrics for a prompt invocation (explicit values).
   */
  async track(options: TrackOptions): Promise<void> {
    await fetch(`${this.baseUrl}/api/sdk/metrics`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
  }

  /**
   * Auto-track from an LLM response object.
   * Automatically extracts token counts from any provider and computes a rating.
   *
   * @param promptVersionId - The version ID returned by `get()`
   * @param llmResponse - The raw response from your LLM provider
   * @param latencyMs - Time taken for the LLM call (ms)
   * @param overrides - Manually override rating or attach metadata
   */
  async trackAuto(
    promptVersionId: string,
    llmResponse: unknown,
    latencyMs: number,
    overrides?: TrackAutoOverrides,
  ): Promise<{ tokenCount: number; latencyMs: number; autoRating: 1 | 2 | 3 | 4 | 5 }> {
    const tokens = extractTokens(llmResponse);
    const autoRating = overrides?.rating ?? computeAutoRating(latencyMs, tokens.tokenCount);

    await this.track({
      promptVersionId,
      latencyMs,
      tokenCount: tokens.tokenCount || undefined,
      promptTokens: tokens.promptTokens || undefined,
      completionTokens: tokens.completionTokens || undefined,
      rating: autoRating,
      metadata: overrides?.metadata,
    });

    return { tokenCount: tokens.tokenCount, latencyMs, autoRating };
  }

  /**
   * One-liner: fetch a prompt, call your LLM, and automatically track everything.
   *
   * The callback receives the formatted prompt content and should return the LLM response.
   * Latency, token counts, and rating are all tracked automatically.
   *
   * @example
   * const { response } = await client.run('my-prompt', (content) =>
   *   openai.chat.completions.create({
   *     model: 'gpt-4o-mini',
   *     messages: [{ role: 'user', content }]
   *   })
   * );
   */
  async run<T>(
    slug: string,
    fn: (content: string, prompt: PromptResult) => Promise<T>,
    options?: GetOptions & TrackAutoOverrides,
  ): Promise<RunResult<T>> {
    const prompt = await this.get(slug, options);

    const start = Date.now();
    const response = await fn(prompt.content, prompt);
    const latencyMs = Date.now() - start;

    const tokens = extractTokens(response);
    const autoRating = options?.rating ?? computeAutoRating(latencyMs, tokens.tokenCount);

    // Fire-and-forget tracking (non-blocking)
    this.track({
      promptVersionId: prompt.id,
      latencyMs,
      tokenCount: tokens.tokenCount || undefined,
      promptTokens: tokens.promptTokens || undefined,
      completionTokens: tokens.completionTokens || undefined,
      rating: autoRating,
      metadata: options?.metadata,
    }).catch(() => {/* Swallow tracking errors — never fail the main call */});

    return {
      response,
      tokenCount: tokens.tokenCount,
      promptTokens: tokens.promptTokens,
      completionTokens: tokens.completionTokens,
      latencyMs,
      autoRating,
    };
  }

  /**
   * Get a variant assignment for a user in an A/B experiment.
   * Assignment is deterministic — same userId always gets same variant.
   */
  async getVariant(experimentName: string, userIdentifier: string): Promise<ExperimentVariantResult> {
    const res = await fetch(`${this.baseUrl}/api/sdk/experiment/assign`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ experimentName, userIdentifier }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(`PromptVCS: ${error.error || "Failed to get variant"}`);
    }
    return res.json();
  }
}

export default PromptClient;
