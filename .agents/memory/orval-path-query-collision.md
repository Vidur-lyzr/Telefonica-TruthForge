---
name: orval path+query param collision
description: Why an endpoint that mixes a path param and a query param breaks codegen, and the app's fix.
---

An operation that declares BOTH a path parameter AND a query parameter makes orval emit two
exports with the SAME identifier `<OperationId>Params`: a PascalCase zod const (for the path
param) in the zod `api.ts`, and a TS type (for the query params) in `generated/types/`. The
api-zod barrel re-exports both `./generated/api` and `./generated/types`, so TS fails with
TS2308 ("already exported a member named ...").

**Why:** path-only ops (e.g. `/documents/{id}`) generate no `Params` query-type, and query-only
ops generate no `<Op>Params` zod const — only the mix collides. This surfaced building the
Brand Room template detail endpoint.

**How to apply:** in this repo, do NOT mix a path param with a query param on one operation.
The established pattern is client-asserted persona via QUERY (`?roleId=`). For a "detail"
endpoint that also needs `roleId`, make the id a query param too (query-only), e.g.
`GET /brand/template?templateId=&roleId=`, rather than `GET /brand/templates/{templateId}?roleId=`.
A query-only detail endpoint is an acceptable "equivalent detail endpoint".
