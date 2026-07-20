---
name: DB write-behind store pattern
description: Rules for the sync-API + debounced-DB-flush store pattern on autoscale (flushNow retry, no whole-set deletes, instance-tagged ids)
---

# DB write-behind stores (sync API, debounced Postgres flush)

Stores that keep a synchronous write API over an in-memory working set with a debounced serialized DB flush must follow three rules, all learned via architect review of the persistence migration:

1. **flushNow must drain, not just await.** A failed flush re-queues records but leaves `flushTimer` and `inFlight` both null. If `flushNow()` only converts a pending timer into a flush, reads after a failure silently see stale data forever. `flushNow` must start a flush whenever the queue/dirty-set is non-empty, regardless of timer state.

2. **Never whole-set delete on autoscale.** `DELETE WHERE id NOT IN (my in-memory ids)` lets a stale instance destroy rows created by another instance. Track explicitly removed ids and delete only those (`inArray`), re-queueing them on flush failure.

3. **Instance-tag generated ids.** `prefix-${Date.now()}-${counter}` collides across concurrent instances (counter resets per boot). Add a per-boot random suffix (`Math.random().toString(36).slice(2,8)`) — otherwise ON CONFLICT DO NOTHING silently drops one instance's audit event, and upsert-by-id overwrites another instance's row.

**Why:** the app runs on Replit autoscale (multiple instances, no shared memory); audit/enforcement data must not be lost or cross-clobbered.

**How to apply:** any new store following the pattern in `data/observatoryStore.ts` / `data/retrievalLog.ts` / `data/platformUsers.ts`. Accepted residual tradeoffs (demo tier): up to ~500ms of audit events lost on instance recycle (unref'd timers, no SIGTERM flush), and session rows are last-writer-wins per instance.
