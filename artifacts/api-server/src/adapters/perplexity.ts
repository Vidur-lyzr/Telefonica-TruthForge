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
