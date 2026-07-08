// Lyzr Knowledge Base adapter — official Lyzr SDK (lyzr-adk).
//
// When LYZR_API_KEY + LYZR_RAG_ID are configured, semantic candidate retrieval
// is delegated to the Lyzr Studio Knowledge Base. Governance NEVER moves to
// Lyzr: returned candidates are mapped back onto the local governed chunk
// registry (by the chunk id carried in the trained document's source field,
// else exact text match), and clearance / coverage are always computed
// locally. A candidate that cannot be mapped to a governed chunk is dropped —
// fail closed.

import { Studio, type KnowledgeBase } from "lyzr-adk";

export interface LyzrCandidate {
  text: string;
  score: number;
  chunkId?: string;
  docId?: string;
}

export function isLyzrConfigured(): boolean {
  return Boolean(process.env.LYZR_API_KEY && process.env.LYZR_RAG_ID);
}

let kbPromise: Promise<KnowledgeBase> | null = null;

function getKb(): Promise<KnowledgeBase> {
  const apiKey = process.env.LYZR_API_KEY;
  const ragId = process.env.LYZR_RAG_ID;
  if (!apiKey || !ragId) {
    throw new Error(
      "Lyzr is not configured: LYZR_API_KEY and LYZR_RAG_ID are required",
    );
  }
  if (!kbPromise) {
    const studio = new Studio({ apiKey });
    kbPromise = studio.getKnowledgeBase(ragId).catch((err) => {
      kbPromise = null; // do not cache failures
      throw err;
    });
  }
  return kbPromise;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export async function lyzrRetrieve(
  query: string,
  topK: number,
): Promise<LyzrCandidate[]> {
  const kb = await getKb();
  const results = await kb.query(query, { topK });

  return results.map((r) => {
    const meta = r.metadata ?? {};
    return {
      text: r.text ?? "",
      score: typeof r.score === "number" ? r.score : 0,
      // Chunks are trained with source = "<chunk_id>|<doc_id>".
      chunkId:
        str(r.source?.split("|")[0]) ??
        str(meta["chunk_id"]) ??
        str(meta["chunkId"]),
      docId:
        str(r.source?.split("|")[1]) ??
        str(meta["doc_id"]) ??
        str(meta["docId"]),
    };
  });
}

// Training: push a governed chunk into the Lyzr KB as a text document whose
// source encodes chunk/doc identity, so retrieval maps back losslessly.
export async function lyzrTrainText(
  text: string,
  extraInfo: { chunk_id: string; doc_id: string },
): Promise<void> {
  const kb = await getKb();
  const ok = await kb.addText(
    text,
    `${extraInfo.chunk_id}|${extraInfo.doc_id}`,
  );
  if (!ok) {
    throw new Error(`Lyzr train failed for chunk ${extraInfo.chunk_id}`);
  }
}
