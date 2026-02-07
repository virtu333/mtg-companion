# CLAUDE.md — MTG Companion

## Project Overview

MTG Companion is a web application for competitive Magic: The Gathering players, focused on two core tools:
1. **Mulligan Simulator** (MVP, building now) — practice London mulligan decisions with any deck
2. **Hand Reading Tool** (v2) — track and narrow an opponent's likely hand during a game

See `docs/PRD.md` for full product requirements.

## Tech Stack

- **Frontend**: React 18+ with TypeScript, Vite, Tailwind CSS
- **State Management**: Zustand
- **Backend**: Node.js with Express (or Hono), TypeScript
- **Database**: PostgreSQL via Neon (serverless) — even for MVP, to avoid SQLite→Postgres migration later
- **Auth**: TBD (P1) — likely Clerk or Auth.js; design API to support auth from the start
- **Deployment**: Vercel (static frontend + serverless API functions)
- **Monorepo**: Turborepo with shared packages

## Abstractions Policy
- No premature abstractions for single-use code
- EXCEPTION: shared packages (deck-parser, scryfall-client, shared-types) should be designed

## Before Editing Shared Packages
When modifying packages/shared-types, packages/deck-parser, or packages/scryfall-client:
1. Read all files that import from the package
2. List downstream impacts
3. Propose changes with migration notes if types change

## Repository Structure

```
mtg-companion/
├── apps/
│   ├── web/                  # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/       # CardImage, Layout, ErrorBoundary, MigrationBanner
│   │   │   │   └── mulligan/     # DeckInput, HandDisplay, MulliganControls,
│   │   │   │                     # BottomingInterface, DrawPhase, SimulationSection, StatsPanel
│   │   │   ├── hooks/            # useAuthSync (auth state → store hydration)
│   │   │   ├── stores/           # Zustand stores (deckStore, simulationStore, statsStore, deckLibraryStore)
│   │   │   ├── pages/            # MulliganPage, ProfilePage, ComingSoonPage, NotFoundPage
│   │   │   └── lib/              # API client, clerkHelpers, useDocumentTitle, deckId
│   │   └── ...
│   └── api/                  # Node.js backend
│       └── src/
│           ├── app.ts            # Express app setup (exported for testing)
│           ├── index.ts          # Server entry point (imports app, calls listen)
│           └── routes/
│               ├── cards.ts      # POST /api/cards/resolve
│               └── cards.test.ts # API integration tests
├── packages/
│   ├── shared-types/         # Shared TypeScript types (Card, Deck, MulliganDecision)
│   ├── deck-parser/          # Decklist parsing logic (shared between frontend/backend)
│   └── scryfall-client/      # Scryfall API client with caching
├── api/                      # Vercel serverless functions (production API)
│   ├── cards/
│   │   └── resolve.ts        # POST /api/cards/resolve (public, no auth)
│   ├── decks/
│   │   ├── index.ts          # GET/POST /api/decks (auth required)
│   │   └── [id].ts           # PATCH/DELETE /api/decks/:id (auth required)
│   ├── decisions/
│   │   ├── index.ts          # GET/POST /api/decisions (auth required)
│   │   └── clear.ts          # DELETE /api/decisions/clear (auth required)
│   ├── lib/
│   │   ├── auth.ts           # verifyAuth() — Clerk JWT verification
│   │   ├── db.ts             # Neon Postgres query helpers
│   │   └── schema.sql        # Database DDL
│   ├── migrate.ts            # POST /api/migrate (auth required, idempotent)
│   ├── health.ts             # GET /api/health
│   └── tsconfig.json
├── docs/
│   ├── PRD.md                # Product requirements
│   ├── ARCHITECTURE.md       # Technical architecture decisions
│   └── HAND_READING_SPEC.md  # Hand reading tool v2 spec
├── scripts/
│   └── build-vercel.sh       # Vercel build: esbuild bundles serverless fns, then Vite builds frontend
├── .github/workflows/ci.yml  # GitHub Actions CI (lint, typecheck, test)
├── CLAUDE.md                 # This file
├── eslint.config.js          # ESLint flat config (typescript-eslint + react-hooks)
├── vercel.json               # Vercel deployment config (calls scripts/build-vercel.sh)
├── turbo.json
├── package.json
└── tsconfig.base.json
```

## Key Architectural Decisions

### Why Monorepo
Deck parsing and Scryfall client logic are needed on both frontend (for instant parsing feedback) and backend (for server-side resolution and caching). Shared types prevent drift.

### Why Postgres from Day 1
We know user accounts and server-side data are coming (P1). Starting with Neon serverless Postgres avoids a data migration later. The free tier is sufficient for MVP. Local dev uses the Neon dev branch.

### Why Server-Side Scryfall Proxy
- Respect Scryfall's rate limits from a single origin rather than per-client
- Server-side caching (cards rarely change within a set)
- Batch resolution via `/cards/collection` endpoint
- Frontend doesn't need to handle rate limiting

### Shared Card Display Component
`CardImage` component handles: normal cards (use `image_uris.normal`), DFCs (use `card_faces[0].image_uris.normal`), loading/error states. Uses opacity-based fade-in (not display:none toggle) for reliable image loading. This component is reused across mulligan sim and hand reading tool.

### Local-First with Sync
MVP stores decision logs in localStorage. When auth is added (P1), we migrate local data to server on first login. Design the data model so localStorage shape matches the DB row shape.

### Navigation Shell
Even in MVP, the app has a top-level nav bar with: Mulligan Simulator (active), Hand Reading (coming soon / disabled), Profile (coming soon / disabled). This sets user expectations and makes adding tools seamless.

## Data Models

### Core Types (in `packages/shared-types/`)

```typescript
// Card as resolved from Scryfall, trimmed to what we need
interface ResolvedCard {
  scryfallId: string;
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  power?: string;
  toughness?: string;
  colors: string[];
  imageUri: string;        // Already resolved (handles DFCs)
  backImageUri?: string;   // For DFCs
  cmc: number;
}

// A parsed decklist
interface Deck {
  id: string;              // UUID
  name: string;
  format?: string;
  mainboard: DeckEntry[];
  sideboard: DeckEntry[];
  createdAt: string;
  updatedAt: string;
}

interface DeckEntry {
  quantity: number;
  card: ResolvedCard;
}

// A single mulligan decision record
interface MulliganDecision {
  id: string;
  deckId: string;
  timestamp: string;
  handCards: string[];     // Array of scryfallIds
  decision: 'keep' | 'mulligan';
  mulliganNumber: number;  // 0 = first hand, 1 = after 1 mull, etc.
  bottomedCards?: string[]; // scryfallIds put on bottom
  onPlay: boolean;
  notes?: string;
}

// Aggregate stats (computed, not stored)
interface DeckMulliganStats {
  deckId: string;
  totalHands: number;
  keepRate: number;
  averageMulligans: number;
  mulliganDistribution: Record<number, number>; // {0: 45, 1: 30, 2: 5}
}
```

## Scryfall Integration

### Resolution Strategy
1. Parse decklist → extract unique card names
2. POST to `/cards/collection` with `{ identifiers: [{ name: "Card Name" }] }` (up to 75 per request)
3. Cards not found in batch → fuzzy fallback via `/cards/named?fuzzy=` (handles Arena name variants)
4. Cache results server-side (24h TTL, cards don't change within a set)
5. Return resolved cards + aliases (input name → canonical name mappings) to frontend
6. Frontend caches in Zustand store for session duration

### DFC Handling
- Check for `card_faces` array on response
- Use `card_faces[0].image_uris.normal` for front face
- Store `card_faces[1].image_uris.normal` as `backImageUri`
- Card name: use the full `name` field (e.g., "Bloodsoaked Insight // Sanguine Morass")
- For parsing: match on front face name only
- Name resolution: scryfall-client maps results back to input names (not Scryfall canonical); `buildDeckArray` also indexes by front face name as fallback

### Error Handling
- Cards not found: flag in UI, allow simulation with remaining cards
- Rate limit hit: queue and retry with backoff
- Network errors: show error state, allow retry

## Shuffling Algorithm
Use Fisher-Yates shuffle. `Math.random()` is acceptable for practice tool. If users request it, can upgrade to `crypto.getRandomValues()` later.

## External APIs
- Never commit Scryfall response data as fixtures without scrubbing (large JSON payloads bloat the repo)
- Rate limit: max 10 req/sec to api.scryfall.com. Always use the /cards/collection batch endpoint over individual lookups.
- Cache Scryfall responses in dev — don't re-fetch during rapid iteration

## Development Workflow

### Running Locally
```bash
# Install dependencies
pnpm install

# Start dev servers (both frontend and backend)
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Clean build outputs
pnpm clean
```

### Environment Variables
```
# apps/api/.env (see apps/api/env.example)
PORT=3001                      # API server port
CORS_ORIGIN=http://localhost:5173  # Comma-separated origins
SCRYFALL_CACHE_TTL=86400       # 24 hours in seconds
DATABASE_URL=postgresql://...  # Neon connection string
CLERK_SECRET_KEY=sk_test_...   # Clerk secret key for JWT verification

# apps/web/.env (see apps/web/env.example)
VITE_API_URL=http://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  # Clerk publishable key (optional — app works without it)
```

## Current Phase: Phase 2 — Auth + Server Persistence

### Phase 1 (Complete)
1. ~~Set up monorepo structure (Turborepo, shared packages)~~ ✅
2. ~~Build `deck-parser` package~~ ✅ 24 tests
3. ~~Build `scryfall-client` package~~ ✅ 20 tests
4. ~~Build API server with `/api/cards/resolve` endpoint~~ ✅ 8 tests
5. ~~Build frontend (app shell, deck input, mulligan sim, draw phase, stats)~~ ✅ 36 web tests
6. ~~Deploy (Vercel serverless + CI)~~ ✅
7. ~~Post-deploy fixes (images, DFC, Arena names)~~ ✅
8. ~~Play/draw toggle + saved decklists~~ ✅

### Phase 2 — Auth + Database
1. ~~Clerk frontend (ClerkProvider, SignIn/UserButton, ProfilePage)~~ ✅
2. ~~Database schema + query helpers (Neon Postgres, api/lib/db.ts)~~ ✅
3. ~~Auth middleware (api/lib/auth.ts, JWT verification, CORS)~~ ✅
4. ~~Deck CRUD endpoints (api/decks/)~~ ✅
5. ~~Decision endpoints + migration (api/decisions/, api/migrate.ts)~~ ✅
6. ~~Store refactoring for dual-mode (localStorage + server sync)~~ ✅
7. ~~Migration banner UI~~ ✅
8. Profile page + polish ← current

### Auth Architecture
- **Frontend**: `ClerkProvider` → `ClerkAuthBridge` → `useAuthContext()` context
- **Auth sync**: `AuthSync` component watches sign-in/out, hydrates stores from server
- **Stores**: Dual-mode — writes to localStorage always, syncs to server when token available
- **Serverless fns**: `api/lib/auth.ts` verifies Clerk JWTs, lazy-creates user rows
- **DB**: Neon Postgres — `users`, `saved_decks`, `mulligan_decisions` tables
- **Migration**: `MigrationBanner` prompts to migrate localStorage → server on first sign-in

### What's NOT in Phase 2
- Hand reading tool (nav link exists but disabled)
- Decision notes
- Card-level analytics

## Conventions

- Use `pnpm` as package manager
- Strict TypeScript (`strict: true`)
- ESLint + Prettier
- Tailwind for all styling, no CSS modules
- Component files: PascalCase (e.g., `CardImage.tsx`)
- Utility/hook files: camelCase (e.g., `useSimulation.ts`)
- Test files: `*.test.ts(x)` colocated with source
- Commits: conventional commits (`feat:`, `fix:`, `chore:`)
