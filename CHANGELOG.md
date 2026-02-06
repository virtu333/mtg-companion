# Changelog

## Unreleased

### Added
- **Decision logging** — every keep/mulligan decision persisted to localStorage, survives page refresh
  - Records hand contents, decision, mulligan number, bottomed cards, timestamp
  - Deck ID computed as deterministic djb2 hash of sorted mainboard
- **Stats panel** — per-deck aggregate stats shown below the simulation
  - Total hands, keep rate, average mulligans, mulligan distribution bar chart
  - Clear history button with confirmation guard
- **statsStore** — Zustand store backed by localStorage (`mtg-companion:decisions` key)
- **deckId** — deterministic 8-char hex hash added to deckStore (computed on resolve, reset on clear)
- **Web app tests** — 19 tests (7 deckId, 12 statsStore) via vitest + jsdom

## 0.2.0 — Code Review Fixes

### Fixed
- **Duplicate card bottoming bug** — simulation now uses `CardInstance` wrapper with unique `instanceId` per card, fixing incorrect bottoming when hand contains multiple copies of the same card
- **Stale API responses** — `AbortController` cancels in-flight resolve requests when user submits a new deck
- **ComingSoonPage** — `replace('-', ' ')` now replaces all hyphens, not just the first

### Added
- **Error boundary** — catches render errors app-wide, shows recovery UI instead of white screen
- **404 page** — catch-all route for unrecognized URLs
- **API integration tests** — 8 tests via supertest covering validation, error handling, and happy path
- **Scryfall 429 retry** — exponential backoff (up to 3 retries), respects `Retry-After` header
- **Scryfall inter-batch delay** — 100ms between batch requests to respect rate limits
- **ESLint** — flat config with typescript-eslint and react-hooks plugin, lint scripts on all packages
- **Document titles** — each page sets browser tab title via `useDocumentTitle` hook
- **Favicon** — SVG favicon and meta description tag
- **`env.example` files** — for both `apps/api` and `apps/web`
- **`DrawnCard` and `CardInstance` types** in shared-types (eliminates duplication)
- **`MtgColor` union type** — `'W' | 'U' | 'B' | 'R' | 'G'` replaces `string[]` for card colors
- 5 new scryfall-client tests (retry, backoff, inter-batch delay, cache eviction)

### Changed
- **Zustand selectors** — `DeckInput` and `SimulationSection` use individual field selectors instead of destructuring entire store
- **API server hardened** — helmet security headers, morgan request logging, 50kb body limit, max 300 cards per request, null entry guard, cache TTL validation at startup
- **CORS** — supports comma-separated multi-origin via `CORS_ORIGIN` env var
- **API app/server split** — Express app exported from `app.ts` for testability, `index.ts` only calls listen
- **API start script** — uses `tsx` instead of `node dist/` (works without pre-building shared packages)
- **`@types/express`** — pinned to v4 to match express v4
- **Build config** — `"type":"module"` on all shared packages, turbo `test` depends on `^build`, `tsc --noEmit` replaces `tsc -b` in web build, clean scripts added
- **Scryfall cache** — lazy eviction of expired entries on read (prevents unbounded memory growth)

### Security
- **helmet** middleware adds security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- **Request body limit** — 50kb cap prevents oversized payloads
- **Input validation** — array length cap (300), null/type guards on card entries
- **Fetch timeout** — 30s `AbortSignal.timeout()` on frontend API calls

## 0.1.0 — Mulligan Simulator MVP (Chunks 0–4)

### Added
- **Mulligan simulation** — full keep/mulligan/bottom/draw flow with Fisher-Yates shuffle
  - Opening hand display with card images from Scryfall
  - Mulligan up to 6 times (auto-keep at 1 card)
  - London mulligan bottoming: select exactly N cards to put back
  - Post-keep draw phase with turn-by-turn card draws
- **Deck input** — paste a decklist, parse it, resolve via Scryfall
  - Supports MTGO (`4 Card Name`), Arena (`4 Card Name (SET) 123`), and `4x Card Name` formats
  - Sideboard detection via blank line, `Sideboard` header, or `SB:` prefix
  - Parse error display with line numbers
  - Not-found card warnings from Scryfall
- **Scryfall client** — batch card resolution with `/cards/collection` (75 per request)
  - DFC handling: front face data + back image URI
  - In-memory cache with 24h TTL
- **API server** — `POST /api/cards/resolve` endpoint with input validation
- **App shell** — React Router with nav bar (Mulligan Simulator active, Hand Reading + Profile disabled)
- **Shared types** — `ResolvedCard`, `Deck`, `DeckEntry`, `ParseResult`, `MulliganDecision`, `DeckMulliganStats`, `SimulationPhase`
- **Monorepo** — Turborepo + pnpm workspaces with 3 shared packages and 2 apps
