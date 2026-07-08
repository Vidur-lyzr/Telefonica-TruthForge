// Lyzr Knowledge Base adapter — real Lyzr Studio RAG API client.
//
// When LYZR_API_KEY + LYZR_RAG_ID are configured, semantic candidate retrieval
// is delegated to the Lyzr KB (POST https://rag-prod.studio.lyzr.ai/v3/rag/).
// Governance NEVER moves to Lyzr: returned candidates are mapped back onto the
// local governed chunk registry (by chunk id metadata, else exact text match),
// and clearance / coverage are always computed locally. A candidate that cannot
// be mapped to a governed chunk is dropped — fail closed.

const LYZR_RAG_BASE = process.env.LYZR_RAG_BASE_URL ?? "https://rag-prod.studio.lyzr.ai";

export interface LyzrCandidate {
  text: string;
  score: number;
  chunkId?: string;
  docId?: string;
}

export function isLyzrConfigured(): boolean {
  return Boolean(process.env.LYZR_API_KEY && process.env.LYZR_RAG_ID);
}

interface LyzrRetrieveDoc {
  text?: string;
  page_content?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  extra_info?: Record<string, unknown>;
  source?: string;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export async function lyzrRetrieve(
  query: string,
  topK: number,
): Promise<LyzrCandidate[]> {
  const apiKey = process.env.LYZR_API_KEY;
  const ragId = process.env.LYZR_RAG_ID;
  if (!apiKey || !ragId) {
    throw new Error("Lyzr is not configured: LYZR_API_KEY and LYZR_RAG_ID are required");
  }

  const res = await fetch(`${LYZR_RAG_BASE}/v3/rag/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ rag_id: ragId, query, top_k: topK }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Lyzr retrieve failed: HTTP ${res.status} ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as unknown;
  const docs: LyzrRetrieveDoc[] = Array.isArray(data)
    ? (data as LyzrRetrieveDoc[])
    : Array.isArray((data as { documents?: unknown }).documents)
      ? ((data as { documents: LyzrRetrieveDoc[] }).documents)
      : Array.isArray((data as { results?: unknown }).results)
        ? ((data as { results: LyzrRetrieveDoc[] }).results)
        : [];

  return docs.map((d) => {
    const meta = { ...(d.extra_info ?? {}), ...(d.metadata ?? {}) };
    return {
      text: d.text ?? d.page_content ?? "",
      score: typeof d.score === "number" ? d.score : 0,
      chunkId: str(meta["chunk_id"]) ?? str(meta["chunkId"]),
      docId: str(meta["doc_id"]) ?? str(meta["docId"]),
    };
  });
}

// Training: push a governed chunk into the Lyzr KB as a text document with
// chunk/doc identity in extra_info so retrieval can be mapped back losslessly.
export async function lyzrTrainText(
  text: string,
  extraInfo: { chunk_id: string; doc_id: string },
): Promise<void> {
  const apiKey = process.env.LYZR_API_KEY;
  const ragId = process.env.LYZR_RAG_ID;
  if (!apiKey || !ragId) {
    throw new Error("Lyzr is not configured: LYZR_API_KEY and LYZR_RAG_ID are required");
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([text], { type: "text/plain" }),
    `${extraInfo.chunk_id}.txt`,
  );
  form.append("rag_id", ragId);
  form.append("data_parser", "txt_parser");
  form.append("extra_info", JSON.stringify(extraInfo));

  const res = await fetch(`${LYZR_RAG_BASE}/v3/train/txt/`, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Lyzr train failed: HTTP ${res.status} ${body.slice(0, 300)}`);
  }
}
