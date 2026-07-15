// Densification overlay: extra chunks appended to existing corpus docs at load
// time. Authored in parallel batches; ids use the "<docId>#dN" suffix so they
// never collide with original chunk ids. Fictional / illustrative only.
import type { Chunk } from "../../corpus";
import { DENSIFY_BATCH_1 } from "./batch1";
import { DENSIFY_BATCH_2 } from "./batch2";
import { DENSIFY_BATCH_3 } from "./batch3";
import { DENSIFY_BATCH_4 } from "./batch4";
import { DENSIFY_BATCH_5 } from "./batch5";
import { DENSIFY_BATCH_6 } from "./batch6";
import { DENSIFY_BATCH_7 } from "./batch7";

const BATCHES: Record<string, Chunk[]>[] = [
  DENSIFY_BATCH_1,
  DENSIFY_BATCH_2,
  DENSIFY_BATCH_3,
  DENSIFY_BATCH_4,
  DENSIFY_BATCH_5,
  DENSIFY_BATCH_6,
  DENSIFY_BATCH_7,
];

export const EXTRA_CHUNKS: Record<string, Chunk[]> = {};
for (const batch of BATCHES) {
  for (const [docId, chunks] of Object.entries(batch)) {
    if (EXTRA_CHUNKS[docId]) {
      throw new Error(`densify: doc ${docId} appears in more than one batch`);
    }
    EXTRA_CHUNKS[docId] = chunks;
  }
}
