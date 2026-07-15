---
name: Live upload persistence and test cleanup
description: Manually uploaded docs survive api-server restarts via Qdrant payload hydration; cleaning test uploads requires deleting Qdrant points, not restarting.
---

Manually uploaded documents are NOT purely in-memory: the full document object is stored as a payload on its Qdrant points, and the server rehydrates all live docs from those payloads on boot.

**Why:** A restart therefore does not clear test uploads — they come back. During e2e testing, every successful upload permanently joins the demo corpus until its points are removed.

**How to apply:** To clean up test uploads, delete their Qdrant points by payload filter (key `docId`, `match.any` of the live-upload doc ids) via the points/delete endpoint with `wait=true`, then restart the api-server so the in-memory corpus rehydrates without them. Orphaned points are safe in the other direction: retrieval drops Qdrant hits whose ids are unknown to the governed registry (fail closed).

Also: the upload route rejects files whose extracted text is under 40 characters (`empty_extraction`, 422) — e2e test plans must attach files with a few hundred characters of real prose or the upload "fails" for a non-bug reason.
