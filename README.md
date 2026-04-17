# Umbraco Package Schema Worker

A Cloudflare Worker that provides a stable, consistent URL structure for the [Umbraco](https://umbraco.com) package JSON schema.

## Why does this exist?

The `umbraco-package.json` schema is published to npm as part of `@umbraco-cms/backoffice`, and served via jsDelivr. However, the path to the schema file changed between versions:

| Version range | Schema path on jsDelivr |
|---|---|
| v14.0.0 – v17.1.x | `dist-cms/umbraco-package-schema.json` |
| v17.2.0+ | `umbraco-package-schema.json` (root) |
| Before v14 | Schema does not exist |

This worker hides those differences behind a single, predictable URL pattern — useful for editor tooling, CI pipelines, and anything that needs to reference a versioned schema without knowing which CDN path applies.

## URL patterns

| URL | Description |
|---|---|
| `/umbraco-package/{version}` | Specific version, e.g. `/umbraco-package/17.2.2` |
| `/umbraco-package/latest` | Latest published release |
| `/umbraco-package/v{major}/latest` | Latest release within a major, e.g. `/umbraco-package/v17/latest` |

## How it works

1. The worker parses the requested version from the URL.
2. It tries to fetch the schema from jsDelivr at the new root path first, then falls back to the old `dist-cms/` path if that returns a 404.
3. The schema body is proxied back to the client with `Content-Type: application/schema+json` and `Access-Control-Allow-Origin: *`.

Version resolution for `latest` and `v{major}/latest` is handled natively by jsDelivr — no npm registry calls required.

## Tech stack

- **[Cloudflare Workers](https://developers.cloudflare.com/workers/)** — serverless edge runtime
- **TypeScript**
- **[Wrangler](https://developers.cloudflare.com/workers/wrangler/)** — Cloudflare's CLI for building and deploying Workers
- **[Vitest](https://vitest.dev/)** + **[@cloudflare/vitest-pool-workers](https://developers.cloudflare.com/workers/testing/vitest-integration/)** — test suite running inside the Workers runtime

## Development

```bash
npm run dev       # start local dev server at http://localhost:8787
npm test          # run the test suite
npm run deploy    # deploy to Cloudflare
```
