// ─── TinyFish Service Layer ───────────────────────────────────────────────────
// Implements Search, Fetch, and Agent endpoints with typed request/response
// handling, timeouts, retry logic, and graceful degradation.

import type {
  TinyFishSearchResult,
  TinyFishFetchResult,
  TinyFishAgentResponse,
} from "@/types";

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY!;

function baseHeaders(): HeadersInit {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) {
    throw new Error("TINYFISH_API_KEY is not configured in .env");
  }
  return {
    "X-API-Key": key,
    "Content-Type": "application/json",
  };
}

// ─── Retry helper ─────────────────────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

// ─── 1. SEARCH ────────────────────────────────────────────────────────────────
// Discovers live opportunity listings relevant to a user query.
export interface SearchOptions {
  query: string;
  purpose?: string;
  location?: string;
  language?: string;
  includeDomains?: string;
  excludeDomains?: string;
  recencyMinutes?: number;
}

export interface SearchResult {
  results: TinyFishSearchResult[];
  query: string;
}

export async function tinyfishSearch(
  opts: SearchOptions,
  timeoutMs = 15_000
): Promise<SearchResult> {
  return withRetry(async () => {
    const params = new URLSearchParams({ query: opts.query });
    if (opts.purpose) params.set("purpose", opts.purpose);
    if (opts.location) params.set("location", opts.location);
    if (opts.language) params.set("language", opts.language);
    if (opts.includeDomains) params.set("include_domains", opts.includeDomains);
    if (opts.excludeDomains) params.set("exclude_domains", opts.excludeDomains);
    if (opts.recencyMinutes != null)
      params.set("recency_minutes", String(opts.recencyMinutes));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(
        `https://api.search.tinyfish.ai?${params.toString()}`,
        { headers: baseHeaders(), signal: controller.signal }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`TinyFish Search error ${res.status}: ${body}`);
      }

      const data = await res.json();

      // Normalize response — TinyFish returns { results: [...] }
      const raw: Array<{ title?: string; url?: string; snippet?: string; source?: string }> =
        data.results ?? data.data ?? [];

      const results: TinyFishSearchResult[] = raw.map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        snippet: r.snippet ?? "",
        source: r.source ?? r.url ?? "",
      }));

      return { results, query: opts.query };
    } finally {
      clearTimeout(timer);
    }
  });
}

// ─── 2. FETCH ─────────────────────────────────────────────────────────────────
// Inspects original opportunity pages and extracts structured content.
// Uses Chromium rendering — ideal for JavaScript-heavy pages.
export interface FetchOptions {
  urls: string[]; // max 10 per request
}

export async function tinyfishFetch(
  opts: FetchOptions,
  timeoutMs = 30_000
): Promise<TinyFishFetchResult[]> {
  if (!opts.urls.length) return [];

  return withRetry(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Split into batches of 10 (API limit)
    const batches: string[][] = [];
    for (let i = 0; i < opts.urls.length; i += 10) {
      batches.push(opts.urls.slice(i, i + 10));
    }

    try {
      const allResults: TinyFishFetchResult[] = [];

      for (const batch of batches) {
        const res = await fetch("https://api.fetch.tinyfish.ai", {
          method: "POST",
          headers: baseHeaders(),
          body: JSON.stringify({ urls: batch }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`TinyFish Fetch error ${res.status}: ${body}`);
        }

        const data = await res.json();

        // Normalize: TinyFish returns { results: [{ url, content, ... }] }
        const raw: Array<{
          url?: string;
          content?: string;
          markdown?: string;
          title?: string;
          status_code?: number;
          statusCode?: number;
        }> = data.results ?? data.data ?? [];

        allResults.push(
          ...raw.map((r: any) => ({
            url: r.url ?? r.final_url ?? "",
            content: r.text ?? r.content ?? r.markdown ?? r.description ?? "",
            title: r.title,
            statusCode: r.status_code ?? r.statusCode ?? 200,
          }))
        );
      }

      return allResults;
    } finally {
      clearTimeout(timer);
    }
  });
}

// ─── 3. AGENT ─────────────────────────────────────────────────────────────────
// Executes complex multi-step website navigation to extract eligibility
// criteria and application instructions from complex official program pages.
export interface AgentOptions {
  url: string;
  goal: string;
  streaming?: boolean;
}

export async function tinyfishAgent(
  opts: AgentOptions,
  timeoutMs = 60_000
): Promise<TinyFishAgentResponse> {
  return withRetry(
    async () => {
      const endpoint = opts.streaming
        ? "https://agent.tinyfish.ai/v1/automation/run-sse"
        : "https://agent.tinyfish.ai/v1/automation/run";

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: baseHeaders(),
          body: JSON.stringify({ url: opts.url, goal: opts.goal }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`TinyFish Agent error ${res.status}: ${body}`);
        }

        if (opts.streaming) {
          // Consume SSE stream and collect the final result
          const text = await res.text();
          const lines = text.split("\n").filter((l) => l.startsWith("data:"));
          let finalResult = "";
          for (const line of lines) {
            try {
              const payload = JSON.parse(line.slice(5).trim());
              if (payload.result) finalResult = payload.result;
              if (payload.type === "final" || payload.done) {
                finalResult = payload.result ?? finalResult;
                break;
              }
            } catch {
              // ignore malformed SSE lines
            }
          }
          return { result: finalResult, success: !!finalResult };
        }

        const data = await res.json();
        return {
          result: data.result ?? data.output ?? JSON.stringify(data),
          steps: data.steps,
          success: true,
        };
      } finally {
        clearTimeout(timer);
      }
    },
    2, // fewer retries — agent tasks are expensive
    2000
  );
}

// ─── Opportunity extraction helpers ──────────────────────────────────────────
// Deduplicates by URL and ranks by relevance score
export function deduplicateByUrl<T extends { url?: string; sourceUrl?: string }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = (item.url ?? item.sourceUrl ?? "").toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
