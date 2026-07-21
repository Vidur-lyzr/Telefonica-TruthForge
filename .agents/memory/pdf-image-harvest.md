---
name: PDF image harvest without sharp
description: Extracting embedded PDF raster images server-side using unpdf plus a hand-rolled zlib PNG encoder
---

# Harvesting embedded PDF images without native image libraries

There is no headless browser or sharp in the api-server bundle. Embedded PDF raster extraction works with `unpdf` (`getDocumentProxy` + `extractImages` per page), which returns raw pixel buffers with `channels` of 1 (gray), 3 (RGB) or 4 (RGBA) — all 8-bit.

Encode to PNG with a minimal encoder over `zlib.deflateSync` (filter byte 0 per row, expand gray/RGB to the matching PNG color type): no native deps needed, and the output is a fully valid PNG.

**Why:** sharp/canvas are excluded from the server bundle (native bindings, see esbuild externals memory); pdf.js-based unpdf ships its own serverless build and must stay externalized in build.mjs.

**How to apply:** cap decoded pixels per image (~16M px) — `deflateSync` is synchronous and a huge RGBA buffer stalls the event loop for seconds. Wrap `extractImages` per page in try/catch (some pages fail individually) and dedupe outputs by content hash, since the same embedded image commonly appears on many pages.
