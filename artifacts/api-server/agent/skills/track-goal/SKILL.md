---
name: track-goal
description: A KPI, objective, or target question — "how is X doing", "why is X moving", "are we on target". Reads the governed numeric zone and explains drivers with citations.
---

# SKILL: track-goal

## Trigger
A KPI/objective/target question, or the embedded KPI-panel chat.

## Procedure
1. Scope is resolved before you run.
2. `numeric` for the metric + target + trend.
3. `graph` / `retrieve` for the *drivers* — the mentions and events behind a move.
4. Compose a cited explanation: metric, value vs target, trend, drivers (each cited),
   and the axis it serves.
5. Offer "generate KPI report" (→ generate-document, one-off). Scheduled reports are
   configured in the backend, never from chat.

## Failure rule
If the metric's source is inaccessible, the state is `permission_blocked` — never
estimate a KPI. If no governed metric matches, `no_evidence` — never compute one
from memory.
