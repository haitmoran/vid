# Kinet

A high-performance video aggregation interface built with Next.js, React, and TypeScript.

**Live demo:** https://haitmoran.github.io/k/

## Features

- 1–6 column responsive catalog with 180 demo entries
- Shared `IntersectionObserver` for strict thumbnail lazy-loading
- Intent-only H.264 MP4 previews on hover, focus, or mobile long-press
- Automatic 24-item incremental loading with no numbered pages
- Bright and dark themes with no hydration flash
- Smart TV overscan mode with D-pad navigation across videos, talent, and favorites
- Search plus a collapsible filter drawer for categories, mood, duration, source, and era
- Featured, newest, most-liked, shortest, and longest ranking modes
- Persistent display preferences for 3–6 desktop columns, text sizing, and visible metadata
- Browser-local username/password registration with optional recovery email
- Per-user likes surfaced in the Stars tab
- Two fictional featured-star profiles per video, with quick previews and static profile pages
- A filterable and sortable Stars directory; profile pages link back to that tab
- Dense, edge-to-edge cards with high-contrast overlaid metadata
- Cookie-free visit tracking with an integrated, owner-only analytics dashboard
- Fully static production export

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The static site is written to `out/`.

The demo catalog links to real open-film pages on Internet Archive and a CC0 MDN media example. Its thumbnails and short previews are extracted from the matching permitted source footage. Production ingestion should still retrieve provider metadata through official APIs and generate previews only for content the operator is authorized to process.

Authentication in this static demo is device-local. Passwords are stored as salted PBKDF2 hashes; only a hash of the optional recovery email is retained alongside liked-video IDs in browser storage. A production, cross-device release should replace `lib/localAuth.ts` with a server-backed authentication and database adapter.

## Private visitor analytics

The `/analytics/` section is backed by a free Cloudflare Worker and D1 database. The public site receives only the Worker URL; owner credentials, signing secrets, and analytics rows remain server-side.

The Analytics navigation tab is shown only to the signed-in local manager username `moran`. The Worker independently verifies the same owner username plus its server-side password before returning any statistics.

1. Authenticate Wrangler and create the database:

```bash
npx wrangler login
npx wrangler d1 create kinet-private-analytics
```

2. Copy `analytics-worker/wrangler.toml.example` to `analytics-worker/wrangler.toml`, then replace the D1 database ID and owner username.

3. Apply the schema and configure the three hidden Worker secrets:

```bash
npx wrangler d1 execute kinet-private-analytics --remote --file=analytics-worker/schema.sql --config=analytics-worker/wrangler.toml
npx wrangler secret put ADMIN_PASSWORD --config=analytics-worker/wrangler.toml
npx wrangler secret put ANALYTICS_SALT --config=analytics-worker/wrangler.toml
npx wrangler secret put SESSION_SECRET --config=analytics-worker/wrangler.toml
npx wrangler deploy --config=analytics-worker/wrangler.toml
```

4. Build the public site with the deployed Worker URL:

```bash
NEXT_PUBLIC_ANALYTICS_API_URL=https://kinet-private-analytics.your-subdomain.workers.dev GITHUB_PAGES=true npm run build
```

Tracking respects Do Not Track, uses no cookies, and stores no raw IP addresses. Visitor and session identifiers are pseudonymized with a server-side HMAC secret. The database retains events for 180 days; the dashboard is protected by short-lived signed sessions and rate-limited owner login.
