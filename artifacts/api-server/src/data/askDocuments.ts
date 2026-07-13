// In-memory registry of documents generated from Ask conversations. Each Ask
// turn that invokes the doc-gen Superflow registers its finished draft here so
// the chat can offer real downloads. Deliberately transient (no persistence
// across restarts — same tier as Generate's draft jobs) and capped so a long
// demo session cannot grow unbounded.

import type { GeneratedDraft } from "../agent/generateAgent";

export interface AskDocumentRecord {
  id: string;
  roleId: string;
  createdAt: string;
  draft: GeneratedDraft;
}

// The truthful card the chat renders: status and Guardian outcome are the
// server's own labels, and `formats` is what the bound template really offers.
export interface AskDocumentSummary {
  id: string;
  title: string;
  shape: string;
  templateName: string;
  status: string;
  guardianStatus: string;
  guardianSummary: string;
  formats: string[];
  language: string;
  audience: string;
  confidentiality: string;
  citationsCount: number;
  historic: boolean;
  note: string | null;
  createdAt: string;
}

const MAX_DOCUMENTS = 200;
const documents = new Map<string, AskDocumentRecord>();

function newId(): string {
  return `askdoc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function registerAskDocument(
  draft: GeneratedDraft,
  roleId: string,
): AskDocumentRecord {
  const record: AskDocumentRecord = {
    id: newId(),
    roleId,
    createdAt: new Date().toISOString(),
    draft,
  };
  documents.set(record.id, record);
  // Drop the oldest entries once over the cap (Map preserves insertion order).
  while (documents.size > MAX_DOCUMENTS) {
    const oldest = documents.keys().next().value;
    if (oldest === undefined) break;
    documents.delete(oldest);
  }
  return record;
}

export function getAskDocument(id: string): AskDocumentRecord | undefined {
  return documents.get(id);
}
