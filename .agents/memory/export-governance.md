---
name: Export governance gates
description: How document export enforces guardian, scheduled approval, and external confidentiality server-side.
---
Rules for the document export pipeline (drafts arrive as client JSON, so labels are untrusted):

1. Re-run the Brand Guardian on the submitted draft before rendering; a block refuses the export regardless of client-claimed status.
2. Scheduled-approval lineage is looked up by MULTIPLE server-known keys — draft id, content hash, and the server-stamped reviewItemId — so mutating the draft id alone cannot shake off scheduled provenance. Export/save binds to the approved content hash.
3. External destination: re-derive each citation's confidentiality from the server corpus by docId (not the client label); unknown docIds fail closed with confidentiality_blocked. External never carries non-public content; internalOnly sections and spokesperson guidance are stripped.

**Why:** an architect review found the client could downgrade confidentiality labels or mutate ids to bypass gates; the fix is to trust only server-side sources.

**How to apply:** any new export/share/send path must call buildExportModel (artifacts/api-server/src/export/exportService.ts) or replicate all three gates; never gate on client-supplied labels alone. Full fix would be server-owned draft references (drafts stored server-side, export by id) — acceptable gap for this demo tier and noted as future work.
