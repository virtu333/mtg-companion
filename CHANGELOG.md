# Changelog

## Unreleased

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
