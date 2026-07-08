# SKILLS.md — skill catalog (bodies load on demand)

The agent sees only this catalog. When a task matches, it reads that skill's full
body via the `read` tool, then executes it. One agent, many skills.

| Skill | Load when the user… | Body |
|---|---|---|
| `answer-cited` | asks any question over the knowledge (the default) | skills/answer-cited/SKILL.md |
| `generate-document` | asks for a talking-points doc, press release, Q&A, or any document/report | skills/generate-document/SKILL.md |
| `track-goal` | asks about a KPI, objective, target, or "why is X moving?" | skills/track-goal/SKILL.md |
| `plan-calendar` | asks what's scheduled, about conflicts, or a forecast window | skills/plan-calendar/SKILL.md |

## Routing notes
- Default to `answer-cited`. It is the core; most turns are it.
- `generate-document` does not compose in-agent — it binds to the doc-gen Superflow
  via `invoke_superflow`. The agent's job is to resolve params and hand off.
- `track-goal` and `plan-calendar` read the numeric/graph tools and, for a *report*,
  hand off to `generate-document` (one-off) — scheduled reports are configured in the
  backend, never from chat.
- Every skill re-resolves permission scope at the start. No skill inherits access.
