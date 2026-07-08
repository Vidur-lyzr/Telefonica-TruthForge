---
name: plan-calendar
description: Questions about what is scheduled, calendar conflicts, or forecasting the next N days — reads the unified calendar graph, checks conflicts deterministically, cross-references market signals.
---

# SKILL: plan-calendar

## Trigger
"What's scheduled / any conflicts / forecast the next N days."

## Procedure
1. Scope is resolved before you run.
2. `graph` over the unified calendar (events + dependencies).
3. Deterministic conflict/gap check — conflicts are computed, not guessed.
4. `retrieve` external signals for timing risk.
5. Compose: events, conflicts (each with its evidence), suggestions. A *forecast
   document* hands to generate-document.

## Failure rule
Never assert a conflict without naming both colliding events and their sources.
Scheduling changes are proposals — a human confirms them.
