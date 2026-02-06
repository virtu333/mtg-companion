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
- **Deployment**: Vercel (frontend), Railway or Neon (backend/db)
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
│   │   │   │   ├── common/       # CardImage, Layout, ErrorBoundary
│   │   │   │   └── mulligan/     # DeckInput, HandDisplay, MulliganControls,
│   │   │   │                     # BottomingInterface, DrawPhase, SimulationSection, StatsPanel
│   │   │   ├── stores/           # Zustand stores (deckStore, simulationStore, statsStore)
│   │   │   ├── pages/            # MulliganPage, ComingSoonPage, NotFoundPage
│   │   │   └── lib/              # API client, useDocumentTitle hook, deckId utility
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
├── docs/
│   ├── PRD.md                # Product requirements
│   ├── ARCHITECTURE.md       # Technical architecture decisions
│   └── HAND_READING_SPEC.md  # Hand reading tool v2 spec
├── CLAUDE.md                 # This file
├── eslint.config.js          # ESLint flat config (typescript-eslint + react-hooks)
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
`CardImage` component handles: normal cards (use `image_uris.normal`), DFCs (use `card_faces[0].image_uris.normal`), loading/error states, lazy loading. This component is reused across mulligan sim and hand reading tool.

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
3. Cache results server-side (24h TTL, cards don't change within a set)
4. Return resolved cards to frontend
5. Frontend caches in Zustand store for session duration

### DFC Handling
- Check for `card_faces` array on response
- Use `card_faces[0].image_uris.normal` for front face
- Store `card_faces[1].image_uris.normal` as `backImageUri`
- Card name: use the full `name` field (e.g., "Bloodsoaked Insight // Sanguine Morass")
- For parsing: match on front face name only

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
DATABASE_URL=postgresql://...  # Neon connection string (P1)

# apps/web/.env (see apps/web/env.example)
VITE_API_URL=http://localhost:3001
```

## Current Phase: Phase 1 — Mulligan Simulator MVP

### Implementation Progress
1. ~~Set up monorepo structure (Turborepo, shared packages)~~ ✅
2. ~~Build `deck-parser` package (parse common formats, extract card names)~~ ✅ 23 tests
3. ~~Build `scryfall-client` package (batch resolution, caching, 429 retry)~~ ✅ 18 tests
4. ~~Build API server with `/api/cards/resolve` endpoint~~ ✅ 8 tests
5. ~~Build frontend app shell (nav, routing, layout)~~ ✅
6. ~~Build decklist input page (paste, parse, resolve, show errors)~~ ✅
7. ~~Build mulligan simulator page (display hand, keep/mull flow, bottom cards)~~ ✅
8. ~~Build post-keep draw simulation~~ ✅
9. ~~Build local decision logging + basic stats display~~ ✅ 19 tests
10. Deploy ← **next**

### What's NOT in Phase 1
- User accounts / auth
- Server-side decision storage
- Hand reading tool (nav link exists but disabled)
- Play/draw toggle
- Decision notes
- Saved decklists (user must re-paste)
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
