---
name: Orval hook query options require queryKey
description: Why passing { query: { enabled } } to a generated React Query hook fails typecheck in this repo
---

The Orval-generated React Query hooks in `@workspace/api-client-react` type their
options `query` field as the full `UseQueryOptions` (queryKey is REQUIRED), not a
`queryKey`-omitted variant. So `useGetX(params, { query: { enabled } })` fails
typecheck with "Property 'queryKey' is missing".

**Why:** the codegen config does not strip `queryKey` from the exposed options type.

**How to apply:** to conditionally gate a query, either (a) omit the options arg
entirely and let the query run — changing `params` changes the queryKey and
triggers a refetch automatically, which is usually enough — or (b) if you truly
need `enabled`, also pass a `queryKey` (e.g. reuse `getGetXQueryOptions(params)`),
don't pass a bare `{ query: { enabled } }`.
