---
name: Orval hooks require queryKey when passing query options
description: The generated React Query hooks reject a query-options object that omits queryKey (TS2741), even for enabled.
---

Passing `{ query: { enabled: x } }` to a generated `useXxx` query hook fails typecheck with TS2741 "Property 'queryKey' is missing". The generated `UseQueryOptions` type marks `queryKey` as required even though the hook defaults it internally.

**Why:** Orval's codegen types the `query` option as the full `UseQueryOptions<...> & { queryKey }`, not a Partial. The runtime helper defaults `queryKey` from `getXxxQueryKey(params)`, but the *type* still demands it.

**How to apply:** Whenever you pass any query option (most commonly `enabled` to gate a query on a param being set), also pass an explicit `queryKey` array, e.g. `{ query: { enabled: !!id, queryKey: ["thing", id] } }`. This matches the existing pattern in the hub-ssot `data.tsx` page.
