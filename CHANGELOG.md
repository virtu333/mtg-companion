# Changelog

## 0.7.0 — Auth + Database (Phase 3)

### Added
- **User authentication** — Clerk with Google OAuth. Sign In button in nav, UserButton when signed in. App works fully anonymous when Clerk key is absent
- **Server-side persistence** — Neon serverless Postgres stores decks and mulligan decisions per user
- **Profile page** — shows user ID, saved deck count, total hands, and keeps
- **Migration banner** — prompts signed-in users with existing localStorage data to migrate to server. Idempotent (safe to run twice)
- **Auth context** — `ClerkAuthBridge` + `useAuthContext()` provides unified auth interface that works with or without Clerk
- **Auth sync** — `AuthSync` component watches sign-in/out, hydrates stores from server on login, reverts to localStorage on logout
- **5 new serverless functions**: `api/decks/index.ts` (GET/POST), `api/decks/[id].ts` (PATCH/DELETE), `api/decisions/index.ts` (GET/POST), `api/decisions/clear.ts` (DELETE), `api/migrate.ts` (POST)
- **Auth middleware** — `api/lib/auth.ts` verifies Clerk JWTs via standalone `verifyToken`, lazy-creates user rows
- **DB query helpers** — `api/lib/db.ts` with typed functions for all CRUD operations
- **Database schema** — `api/lib/schema.sql` (users, saved_decks, mulligan_decisions tables)

### Changed
- **deckLibraryStore** — dual-mode: writes to localStorage always, fire-and-forget sync to server when authenticated
- **statsStore** — same dual-mode pattern for mulligan decisions
- **api.ts** — 8 new auth-aware API functions (fetchDecks, saveDeckToServer, etc.)
- **CORS headers** — all serverless functions now allow `Authorization` header; extracted into shared `setCorsHeaders()` helper
- **Nav bar** — Profile link enabled when signed in; Sign In / UserButton on right side
- **Build script** — bundles 7 serverless functions (was 2)

### Fixed
- **@clerk/backend verifyToken** — use standalone export with explicit `secretKey` option (not a method on `createClerkClient()` in v2)

## 0.6.0 — Play/Draw Toggle + Saved Decklists (Phase 2)

### Added
- **Play/draw toggle** — segmented control to switch between On the Play / On the Draw before drawing a hand. When on the draw, turn 1 card is auto-drawn after keeping. Badge shows current mode during simulation
- **Saved decklists** — save resolved decks to localStorage, load them instantly without re-resolving from Scryfall. Supports rename, delete, and upsert (same deck hash updates existing entry)
- **deckLibraryStore** — new Zustand store for saved deck management (localStorage key: `mtg-companion:saved-decks`)
- **simulationStore tests** — 8 tests covering onPlay toggle, auto-draw, persistence across hands, reset
- **deckLibraryStore tests** — 9 tests covering CRUD, persistence, corrupt data handling
- **SavedDeck type** — added to shared-types package

### Changed
- **SimulationSection** — play/draw toggle in idle phase, colored badge in active phases, `onPlay` value flows into decision recording
- **DeckInput** — saved decks list (sorted by last used), inline save form with name input, Load/Delete per deck
- **deckStore** — new `loadSavedDeck` action hydrates store from saved data without Scryfall call

## 0.5.0 — Bug Fixes + Format Support

### Added
- **MTGGoldfish Arena export format** — deck parser now handles MTGGoldfish's Arena export (`4 Card Name <XY>`, no collector number)
- **Fuzzy card name fallback** — when Scryfall batch endpoint can't find a card (e.g. Arena name variants like "Detect Intrusion"), falls back to `/cards/named?fuzzy=` lookup. Resolved cards are aliased so the frontend can match them back to parsed names
- **DFC front-face indexing** — `buildDeckArray` indexes double-faced cards by front face name (e.g. "Bloodsoaked Insight" for "Bloodsoaked Insight // Sanguine Morass") so DFCs always resolve without depending on server aliases

### Fixed
- **Card images not loading** — replaced `display:none`/`block` image toggle with `opacity-0`/`opacity-100` pattern. Images stay in layout so `onLoad` fires reliably; skeleton/error states are absolute overlays
- **59 cards in mainboard (DFC name mismatch)** — scryfall-client now maps resolved cards back to input names (not Scryfall canonical names), and the frontend card map indexes by front face name as fallback
- **StatsPanel infinite re-render loop** — replaced Zustand selector returning new object with `useMemo` on raw state
- **Vercel esbuild overwrite** — added `--allow-overwrite` to esbuild so bundled serverless functions replace source `.ts` files in place

### Changed
- **CardImage component** — container now has fixed `aspect-[488/680]` ratio; image uses `object-cover` + opacity transitions for smooth fade-in
- **Scryfall client** — caches cards by both canonical name and input name (handles DFC + Arena name lookups); 20 tests (was 18)
- **Deck parser** — 24 tests (was 23)

## 0.4.0 — Polish + Deploy (Chunk 6)

### Added
- **Vercel deployment** — frontend as static site, API as serverless functions (no Express overhead)
  - `api/cards/resolve.ts` — standalone serverless function replicating Express route logic
  - `api/health.ts` — health check endpoint
  - `vercel.json` — SPA fallback rewrites, custom build via `scripts/build-vercel.sh`
  - Serverless functions pre-bundled with esbuild (workspace packages use TS source entry points, which Node.js can't import at runtime)
- **GitHub Actions CI** — lint, typecheck, test on push/PR to `main`/`master`
- **Loading spinner** — animated SVG spinner replaces "Resolving..." text during deck resolution
- **Footer** — minimal version footer (`MTG Companion v0.1`)
- **Page subtitle** — instructional text on mulligan page

### Changed
- **API URL fallback** — changed from `http://localhost:3001` to `''` (same-origin) for production Vercel deploys
- **Textarea locked** — disabled after deck resolves (prevents editing stale state)
- **Clear button** — shown after deck resolves (not just when input exists)
- **Mobile responsiveness** — card grids use 3-col on mobile (was 4-col), stats panel stacks on mobile, nav spacing tightens

## 0.3.0 — Decision Logging + Stats (Chunk 5)

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
