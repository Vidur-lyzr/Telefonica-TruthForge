// Push the governed corpus into the configured Lyzr Knowledge Base.
//
// Each governed chunk is trained as its own text document with chunk_id and
// doc_id in extra_info, so retrieval candidates map back losslessly onto the
// local governance registry (which keeps clearance filtering local).
//
// Usage: pnpm --filter @workspace/api-server run lyzr:sync
// Requires: LYZR_API_KEY, LYZR_RAG_ID

import { DOCS } from "../data/corpus";
import { isLyzrConfigured, lyzrTrainText } from "../adapters/lyzr";

async function main(): Promise<void> {
  if (!isLyzrConfigured()) {
    throw new Error(
      "LYZR_API_KEY and LYZR_RAG_ID must be set to sync the corpus.",
    );
  }

  let pushed = 0;
  let failed = 0;

  for (const doc of DOCS) {
    for (const chunk of doc.chunks) {
      const payload = [`${doc.title} — ${chunk.heading}`, "", chunk.text].join(
        "\n",
      );
      try {
        await lyzrTrainText(payload, { chunk_id: chunk.id, doc_id: doc.id });
        pushed += 1;
        process.stdout.write(`trained ${chunk.id}\n`);
      } catch (err) {
        failed += 1;
        process.stderr.write(`FAILED ${chunk.id}: ${String(err)}\n`);
      }
    }
  }

  process.stdout.write(`\nDone: ${pushed} chunks trained, ${failed} failed.\n`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
