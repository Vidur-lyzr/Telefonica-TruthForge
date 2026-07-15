// Live public-data (B channel) acquisition via Perplexity.
//
// The RFP rule is filter-BEFORE-ingest: the editor's keyword / competitor /
// executive / topic filter is baked into the search prompt itself, so
// Perplexity only surfaces mentions that match the agreed rules — never a raw
// web dump. Results come back as structured candidates with +/- sentiment
// flags and the matched terms, and nothing is ingested until a human accepts
// each item.

export interface LiveIngestFilter {
  keywords: string[];
  competitors: string[];
  executives: string[];
  topics: string[];
}

export type CandidateSentiment = "positive" | "negative" | "mixed" | "neutral";

export interface LiveCandidate {
  id: string;
  title: string;
  source: string;
  url: string | null;
  date: string | null;
  excerpt: string;
  sentiment: CandidateSentiment;
  matchedTerms: string[];
}

export function isPerplexityConfigured(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

function filterTerms(filter: LiveIngestFilter): string[] {
  return [
    ...filter.keywords,
    ...filter.competitors,
    ...filter.executives,
    ...filter.topics,
  ]
    .map((t) => t.trim())
    .filter(Boolean);
}

const SENTIMENTS: CandidateSentiment[] = ["positive", "negative", "mixed", "neutral"];

// ---------------------------------------------------------------------------
// Ad-hoc web search for the Ask agent's web_search tool.
//
// Unlike perplexitySearch (the Live Ingest pre-ingest filter), this is a plain
// topical query. Results are UNGOVERNED external material: the caller must
// keep them out of governed citations and numeric facts. Excerpts are
// sanitised here — citation-marker-like patterns are stripped so a web page
// can never smuggle a fake [S1] marker into the model's context.
// ---------------------------------------------------------------------------

export interface WebSearchResult {
  title: string;
  source: string;
  url: string | null;
  date: string | null;
  excerpt: string;
}

const WEB_SEARCH_MAX_RESULTS = 5;
const WEB_SEARCH_TIMEOUT_MS = 20_000;

// Strip anything that looks like a governed citation marker ([S1], [S2, S3],
// [ s4 ]…) plus stray bracketed reference numbers, so external text cannot
// impersonate governed evidence.
function stripCitationLikeMarkers(text: string): string {
  return text
    .replace(/\[\s*S\s*\d+[^\]]*\]/gi, "")
    .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function perplexityWebSearch(query: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not configured");
  const q = query.trim();
  if (!q) return [];

  // Structured output: sonar ignores plain "return only JSON" instructions and
  // answers in prose with [1][2] citation markers, so the schema is enforced by
  // the API itself. The raw search_results metadata is kept as a fallback.
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content:
            "You are a web research assistant. Return recent, reputable public web coverage items. " +
            "For each item: title, source (outlet/site name), url, date (ISO if known) and a 2-3 sentence factual excerpt. " +
            `Return at most ${WEB_SEARCH_MAX_RESULTS} items. If nothing relevant exists, return an empty results array.`,
        },
        {
          role: "user",
          content: `Find recent, reputable public web coverage for: ${q}`,
        },
      ],
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                maxItems: WEB_SEARCH_MAX_RESULTS,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    source: { type: "string" },
                    url: { type: ["string", "null"] },
                    date: { type: ["string", "null"] },
                    excerpt: { type: "string" },
                  },
                  required: ["title", "source", "excerpt"],
                },
              },
            },
            required: ["results"],
          },
        },
      },
    }),
    signal: AbortSignal.timeout(WEB_SEARCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity web search failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    search_results?: {
      title?: string;
      url?: string;
      date?: string;
      snippet?: string;
    }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";

  let raw: unknown[] = [];
  try {
    const parsed = JSON.parse(content) as { results?: unknown };
    if (Array.isArray(parsed)) raw = parsed;
    else if (parsed && Array.isArray((parsed as { results?: unknown }).results)) {
      raw = (parsed as { results: unknown[] }).results;
    }
  } catch {
    raw = [];
  }

  const results: WebSearchResult[] = [];
  for (const item of raw) {
    if (results.length >= WEB_SEARCH_MAX_RESULTS) break;
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const title = stripCitationLikeMarkers(typeof o.title === "string" ? o.title : "");
    const excerpt = stripCitationLikeMarkers(
      typeof o.excerpt === "string" ? o.excerpt : "",
    ).slice(0, 500);
    if (!title || !excerpt) continue;
    results.push({
      title,
      source:
        typeof o.source === "string" && o.source.trim() ? o.source.trim() : "Unknown outlet",
      url: typeof o.url === "string" && o.url.trim() ? o.url.trim() : null,
      date: typeof o.date === "string" && o.date.trim() ? o.date.trim() : null,
      excerpt,
    });
  }
  if (results.length > 0) return results;

  // Fallback: the API's own search_results metadata (title/url/date/snippet)
  // still gives honest external pointers when the model's JSON is unusable.
  for (const item of json.search_results ?? []) {
    if (results.length >= WEB_SEARCH_MAX_RESULTS) break;
    const title = stripCitationLikeMarkers(item.title ?? "");
    const excerpt = stripCitationLikeMarkers(item.snippet ?? "").slice(0, 500);
    if (!title || !excerpt) continue;
    let source = "Unknown outlet";
    if (item.url) {
      try {
        source = new URL(item.url).hostname.replace(/^www\./, "");
      } catch {
        source = "Unknown outlet";
      }
    }
    results.push({
      title,
      source,
      url: item.url?.trim() ? item.url.trim() : null,
      date: item.date?.trim() ? item.date.trim() : null,
      excerpt,
    });
  }
  return results;
}

export async function perplexitySearch(filter: LiveIngestFilter): Promise<LiveCandidate[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not configured");
  const terms = filterTerms(filter);
  if (terms.length === 0) throw new Error("The pre-ingest filter has no terms");

  const filterDescription = [
    filter.keywords.length ? `Keywords: ${filter.keywords.join(", ")}` : null,
    filter.competitors.length ? `Tracked competitors: ${filter.competitors.join(", ")}` : null,
    filter.executives.length ? `Named executives: ${filter.executives.join(", ")}` : null,
    filter.topics.length ? `Priority topics: ${filter.topics.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content:
            "You are a media-monitoring pre-ingest filter for Telefónica's communications team. " +
            "You return ONLY a JSON array, no prose, no markdown fences. Each element: " +
            '{"title": string, "source": string (outlet name), "url": string|null, ' +
            '"date": string|null (ISO date if known), "excerpt": string (2-3 factual sentences from the coverage), ' +
            '"sentiment": "positive"|"negative"|"mixed"|"neutral" (tone toward Telefónica), ' +
            '"matchedTerms": string[] (which of the filter terms this item matched). ' +
            "Only include items that genuinely match at least one filter term. " +
            "Return at most 8 items. If nothing matches, return [].",
        },
        {
          role: "user",
          content:
            "Find recent public press / analyst / market coverage matching this pre-ingest filter:\n" +
            filterDescription,
        },
      ],
      temperature: 0.1,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Perplexity search failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Perplexity returned no parseable candidate list");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(content.slice(start, end + 1));
  } catch {
    throw new Error("Perplexity returned malformed JSON candidates");
  }
  if (!Array.isArray(raw)) throw new Error("Perplexity candidates were not an array");

  const lowerTerms = terms.map((t) => t.toLowerCase());
  const candidates: LiveCandidate[] = [];
  for (const [i, item] of raw.entries()) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const excerpt = typeof o.excerpt === "string" ? o.excerpt.trim() : "";
    if (!title || !excerpt) continue;
    const matched = Array.isArray(o.matchedTerms)
      ? o.matchedTerms.filter((t): t is string => typeof t === "string")
      : [];
    // Enforce the filter server-side too: keep only terms that are actually in
    // the editor's filter, and drop items that match nothing.
    const verified = matched.filter((t) => lowerTerms.includes(t.toLowerCase()));
    const haystack = `${title} ${excerpt}`.toLowerCase();
    const implicit = terms.filter((t) => haystack.includes(t.toLowerCase()));
    const finalMatched = [...new Set([...verified, ...implicit])];
    if (finalMatched.length === 0) continue;
    const sentiment = SENTIMENTS.includes(o.sentiment as CandidateSentiment)
      ? (o.sentiment as CandidateSentiment)
      : "neutral";
    candidates.push({
      id: `live-${Date.now().toString(36)}-${i}`,
      title,
      source: typeof o.source === "string" && o.source.trim() ? o.source.trim() : "Unknown outlet",
      url: typeof o.url === "string" && o.url.trim() ? o.url.trim() : null,
      date: typeof o.date === "string" && o.date.trim() ? o.date.trim() : null,
      excerpt,
      sentiment,
      matchedTerms: finalMatched,
    });
  }
  return candidates;
}
