---
name: Orval schema naming collision
description: Component schema names must not equal operationId-derived names; runtime Zod exports follow the operationId
---

# Orval schema naming

Rule: never give an OpenAPI component schema the same name that orval derives from an operationId (`<OperationId>Body` / `<OperationId>Response`). If they collide, the generated barrel re-exports the name twice and `typecheck:libs` fails with TS2308 "already exported a member".

**Why:** operation `bulkMasterDeckHarvest` auto-generates Zod consts `BulkMasterDeckHarvestBody`/`BulkMasterDeckHarvestResponse`; naming the components the same broke codegen until the components were renamed.

**How to apply:** name components differently from the operationId pattern (e.g. op `bulkX` + components `XBulkBody`). Also note the split: the **runtime Zod consts** in `@workspace/api-zod` are named from the operationId, while the **component names** become TypeScript-only interfaces — server routes must import the operationId-derived names or they hit TS2693 "only refers to a type".
