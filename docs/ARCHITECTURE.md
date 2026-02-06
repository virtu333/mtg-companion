# Architecture — MTG Companion

## System Overview

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Vite + React)        │
│                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Deck     │  │ Mulligan     │  │ Hand      │  │
│  │ Input    │──│ Simulator    │  │ Reading   │  │
│  │ Page     │  │ Page         │  │ Page (v2) │  │
│  └──────────┘  └──────────────┘  └───────────┘  │
│        │              │                           │
│  ┌─────┴──────────────┴──────────────────────┐   │
│  │         Zustand Stores                     │   │
│  │  deckStore | simulationStore | statsStore  │   │
│  └────────────────────┬──────────────────────┘   │
│                       │                           │
│  ┌────────────────────┴──────────────────────┐   │
│  │         localStorage (MVP)                 │   │
│  │  decisions[] | savedDecks[] (P1)           │   │
│  └────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────┘
                        │ HTTP
┌───────────────────────┴───────────────────────────┐
│                   API Server (Node.js)             │
│                                                     │
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │ /api/cards/      │  │ /api/auth/ (P1)        │  │
│  │   resolve        │  │ /api/decks/ (P1)       │  │
│  │   search         │  │ /api/decisions/ (P1)   │  │
│  └────────┬─────────┘  └────────────┬───────────┘  │
│           │                         │               │
│  ┌────────┴─────────┐  ┌───────────┴───────────┐  │
│  │ Scryfall Client  │  │ PostgreSQL (Neon)      │  │
│  │ (with cache)     │  │ users, decks,          │  │
│  └────────┬─────────┘  │ decisions (P1)         │  │
│           │             └──────────────────────┘   │
└───────────┼────────────────────────────────────────┘
            │ HTTPS
┌───────────┴────────────────────────────────────────┐
│           Scryfall API                              │
│           api.scryfall.com                          │
└────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Routing
```
/                    → Redirect to /mulligan
/mulligan            → Mulligan simulator (deck input + simulation)
/hand-reading        → Hand reading tool (v2, shows "coming soon")
/profile             → User profile + stats (P1, shows "coming soon")
*                    → 404 Not Found page
```

### Zustand Stores

**`deckStore`** (`stores/deckStore.ts`) — manages current deck state
- `rawInput: string` — the pasted decklist text
- `parseResult: ParseResult | null` — parsed mainboard/sideboard/errors
- `resolvedCards: ResolvedCard[]` — unique cards resolved from Scryfall
- `notFound: string[]` — card names Scryfall couldn't find
- `resolveStatus: 'idle' | 'loading' | 'done' | 'error'`
- `resolveError: string | null`
- `deckId: string | null` — deterministic djb2 hash of sorted mainboard (computed on resolve)
- Actions: `setRawInput()`, `parse()`, `resolve()`, `clear()`

**`simulationStore`** (`stores/simulationStore.ts`) — manages mulligan simulation state
- `library: CardInstance[]` — remaining cards in deck (each with unique `instanceId`)
- `hand: CardInstance[]` — current hand
- `mulliganCount: number`
- `phase: SimulationPhase` — `'idle' | 'deciding' | 'bottoming' | 'playing'`
- `bottomedCards: CardInstance[]`
- `drawnCards: DrawnCard[]` — `{ turn: number; card: CardInstance }`
- `turnNumber: number`
- Actions: `startNewHand(deckCards)`, `mulligan()`, `keep()`, `bottomCards(instanceIds)`, `drawCard()`, `reset()`

**`statsStore`** (`stores/statsStore.ts`) — manages decision logging and stats
- `decisions: MulliganDecision[]` — loaded from localStorage on init, persisted on every write
- `getStatsForDeck(deckId): DeckMulliganStats` — computes stats from keep decisions only
- Actions: `recordDecision(partial)` (generates id + timestamp), `clearHistory(deckId?)` (all or per-deck)
- localStorage key: `"mtg-companion:decisions"`
- Stats: totalHands = keeps, keepRate = mull0 keeps / total, avgMulligans = mean mulliganNumber of keeps

### Accessibility
- `<nav aria-label="Main navigation">` on main nav bar
- `aria-label="Decklist input"` on textarea
- Disabled nav items use `role="link" aria-disabled="true"`
- `ErrorBoundary` wraps entire app (class component)
- Each page sets `document.title` via `useDocumentTitle` hook

### Component Hierarchy (Mulligan Simulator)

```
ErrorBoundary
└── BrowserRouter
    └── Layout (nav + outlet)
        ├── MulliganPage
        │   ├── DeckInput                      # Textarea, Load/Clear buttons, error/success
        │   ├── SimulationSection              # Shown after deck resolved
        │   │   ├── (idle) → "Draw Opening Hand" button
        │   │   ├── (deciding) → HandDisplay + MulliganControls
        │   │   │   ├── HandDisplay            # Grid of CardImage (uses CardInstance)
        │   │   │   │   └── CardImage (×7)     # Lazy load, error fallback, selectable
        │   │   │   └── MulliganControls       # Keep/Mulligan buttons + counter
        │   │   ├── (bottoming) → BottomingInterface
        │   │   │   ├── HandDisplay (selectable by instanceId)
        │   │   │   └── Confirm Bottom button
        │   │   └── (playing) → DrawPhase
        │   │       ├── HandDisplay (opening hand)
        │   │       ├── Drawn cards timeline
        │   │       └── Draw / New Hand buttons
        │   └── StatsPanel                     # Per-deck stats (auto-hides when empty)
        │       ├── Summary cards (total hands, keep rate, avg mulligans)
        │       ├── Mulligan distribution bar chart
        │       └── Clear History button
        ├── ComingSoonPage
        ├── NotFoundPage (404 catch-all)
```

## API Design

### POST /api/cards/resolve
Resolves a list of card names to full card data via Scryfall.

Request:
```json
{
  "cards": [
    { "name": "Lightning Bolt", "quantity": 4 },
    { "name": "Monastery Swiftspear", "quantity": 4 }
  ]
}
```

Constraints:
- Max 300 cards per request (400 error otherwise)
- Each card must have non-empty `name` string and `quantity >= 1`
- 50kb request body limit

Response:
```json
{
  "resolved": [
    {
      "name": "Lightning Bolt",
      "scryfallId": "...",
      "manaCost": "{R}",
      "typeLine": "Instant",
      "imageUri": "https://cards.scryfall.io/normal/...",
      "cmc": 1,
      "colors": ["R"],
      ...
    }
  ],
  "notFound": ["Misspelled Cardname"]
}
```

Implementation:
1. Validate input (array length, card entries, null guard)
2. Deduplicate card names
3. Check in-memory Map cache (24h TTL, lazy eviction of expired entries)
4. Batch uncached names via Scryfall `/cards/collection` (75 per request, 100ms inter-batch delay)
5. Retry on 429 with exponential backoff (up to 3 retries)
6. Cache results, return all

### API Middleware Stack
- `helmet` — security headers
- `morgan('dev')` — request logging
- `cors` — multi-origin support (comma-separated `CORS_ORIGIN` env var)
- `express.json({ limit: '50kb' })` — body parsing with size limit

### Future Endpoints (P1+)
- `POST /api/auth/signup` / `POST /api/auth/login`
- `GET/POST /api/decks` — CRUD saved decklists
- `POST /api/decisions` — save mulligan decisions
- `GET /api/decisions?deckId=X` — retrieve decisions for analytics

## Database Schema (P1 — design now)

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Saved decklists
CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  format TEXT,
  raw_input TEXT NOT NULL,
  mainboard JSONB NOT NULL,  -- [{name, quantity, scryfallId}]
  sideboard JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Mulligan decisions
CREATE TABLE mulligan_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  deck_id UUID REFERENCES decks(id),
  hand_cards TEXT[] NOT NULL,         -- scryfall IDs
  decision TEXT NOT NULL CHECK (decision IN ('keep', 'mulligan')),
  mulligan_number INT NOT NULL,
  bottomed_cards TEXT[],
  on_play BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scryfall card cache
CREATE TABLE card_cache (
  scryfall_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT now()
);
```

## Deck Parser Design

The parser lives in `packages/deck-parser/` and handles multiple input formats.

### Supported Formats
```
# Standard: "4 Card Name"
4 Lightning Bolt
2 Scalding Tarn

# With 'x': "4x Card Name"
4x Lightning Bolt

# MTGA export: "4 Card Name (SET) Number"
4 Lightning Bolt (FDN) 123

# Sideboard separators
[empty line]
Sideboard
SB:
```

### Parser Output
```typescript
interface ParseResult {
  mainboard: { name: string; quantity: number }[];
  sideboard: { name: string; quantity: number }[];
  errors: { line: number; text: string; reason: string }[];
}
```

### Parsing Strategy
1. Split input by newlines
2. Trim whitespace, skip empty lines (unless detecting sideboard)
3. Detect sideboard separator
4. For each line, try regex patterns in order:
   - `/^(\d+)x?\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?$/`
5. Return structured result with errors for unparseable lines
