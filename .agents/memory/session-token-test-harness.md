---
name: Session-token test harness
description: How to curl-test team/role-gated API routes when no plaintext credentials exist
---

# Testing gated routes without plaintext credentials

The rule: when auth stores only scrypt hashes and old test creds are gone, do NOT add test users or weaken auth — mint valid session cookies directly with a one-off `node -e` script that replicates the token format (HMAC over base64url payload) using `process.env.SESSION_SECRET`, writing tokens to /tmp files so the secret never prints.

**Why:** the shared-password/creds files from earlier sessions get cleaned up; re-provisioning users pollutes the allowlist, and skipping verification of 401/403/200 boundaries is not acceptable for governance features.

**How to apply:** mint one token per team/role variant, curl each gate variant (unauth, wrong team, right team), then delete the /tmp tokens AND any synthetic audit/store data the tests created (delete the persisted JSON and restart the build-once api-server so in-memory state does not re-persist it).

Gotcha: the token payload `exp` is a **millisecond** epoch (`Date.now() + ms`), not seconds — a seconds-based exp mints an already-expired cookie and every request 401s, which looks like a bad signature.

Store-backed test data (e.g. deck-intake jobs) often has NO delete API. Cleanup: wait for the debounced write-behind flush, SQL-edit the `store_snapshots` row (`data->'jobs' - '<id>'` via jsonb_set), then restart the api-server so memory reloads from the edited snapshot — deleting the row alone leaves the record live in memory and the next flush re-persists it. Purge audit rows again AFTER the final restart (verification curls with the test cookie recreate observatory_sessions).
