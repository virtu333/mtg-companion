# MTG Companion — Product Requirements Document

## 1. Problem Statement

Competitive Magic: The Gathering players lack accessible tools for practicing two critical skills: mulligan decision-making and hand reading. Mulligan decisions are one of the highest-leverage moments in a game, yet players have no structured way to practice them offline or track patterns in their decisions across decks and formats. Hand reading — deducing what an opponent likely holds based on their plays and non-plays — is a skill most players develop only through raw experience, with no tooling support despite it being a core competency at higher levels of play.

Existing tools like MTGA's built-in practice mode don't isolate mulligan decisions for focused practice, and no tool exists for hand reading practice. Players who want to improve these skills currently use pen-and-paper methods or simply play more games, which is slow and doesn't provide structured feedback.

The cost of not solving this: players plateau on fundamentals that are difficult to practice deliberately, and the competitive community lacks tools that treat MTG skill development with the same rigor that poker players apply to range analysis and decision tracking.

## 2. Goals

### User Goals
- **Structured mulligan practice**: Players can repeatedly practice mulligan decisions with any deck, offline, at their own pace — building intuition faster than playing full games
- **Hand reading support during online play**: Players can systematically narrow an opponent's likely hand contents during a game, replacing mental guesswork with a visual tracking tool
- **Self-awareness over time**: Players can see aggregate data about their mulligan tendencies (average mulligans per deck, whether specific cards correlate with more mulligans)

### Business Goals
- **Build an engaged user base** around competitive MTG skill improvement tools
- **Establish a platform** that can expand to additional MTG tools (sealed analysis, manabase tools, etc.)
- **Create data value** — aggregated anonymized mulligan/decision data could power future AI-driven features

## 3. Non-Goals (v1)

- **Matchup-aware mulligan training** — mulligans based on opponent archetype is valuable but adds significant complexity; design for it, don't build it yet (premature)
- **AI-powered hand reading suggestions** — the tool tracks what the user marks, it doesn't auto-infer (too complex, needs validated UX first)
- **Mobile native app** — start with responsive web, native iOS/Android comes later (separate initiative)
- **Social/sharing features** — no sharing decklists, mulligan stats, or hand reading sessions between users (premature, low priority for MVP)
- **Draft/limited hand reading** — generic archetype-based hand reading without a known decklist is a future feature (different UX paradigm)
- **Real-time multiplayer** — this is a single-player practice and analysis tool (scope control)

## 4. User Stories

### Mulligan Simulator

- **As a competitive player, I want to paste a decklist from any common source (MTGGoldfish, Moxfield, etc.) so that I can immediately start practicing mulligans with that deck** — this is the entry point; friction here kills adoption
- **As a competitive player, I want to see my 7-card hand displayed as visual card images so that I can evaluate it the same way I would in a real game** — text-only hand display would undermine the practice value
- **As a competitive player, I want to practice the full London mulligan procedure (keep, mull, bottom cards) so that I'm building the right muscle memory** — the bottoming decision is a critical part of the skill
- **As a competitive player, I want to draw subsequent turns after keeping a hand so that I can evaluate whether my keep decision was reasonable** — seeing how hands develop validates or challenges the decision
- **As a competitive player, I want to record whether I kept or mulliganed and see my average mulligan rate per deck so that I can identify if certain decks mulligan more than expected** — the core analytics loop
- **As a competitive player, I want to tag my keep/mull decisions with context (on play/draw, freeform notes) so that I can review my reasoning later** — deliberate practice requires reflection
- **As a player with multiple decks, I want to save and manage multiple decklists so that I can switch between them without re-pasting** — reduces friction for repeat sessions
- **As a player, I want to see which specific cards appear most in hands I mulligan so that I can identify if certain cards are making my hands less keepable** — this is the "does this card make me mulligan more" insight

### Hand Reading Tool (v2 — design for, build later)

- **As a competitive player, I want to load my opponent's known decklist so that I can track their hand contents during a game**
- **As a competitive player, I want to mark cards as "played" each turn so that the tool removes them from the possible hand range**
- **As a competitive player, I want to mark cards as "unlikely in hand" based on non-plays (e.g., didn't play a 1-drop on turn 1) so that the tool narrows the range**
- **As a competitive player, I want to see a ranked list of the most likely cards remaining in my opponent's hand so that I can make better in-game decisions**
- **As a competitive player, I want the input to be fast and tap-friendly so that I can use it during an online match without losing too much time**

### Platform / Shared

- **As a returning user, I want to create an account so that my decklists and mulligan history persist across sessions and devices**
- **As a new visitor, I want to use the mulligan simulator without creating an account so that I can try it before committing** — anonymous use with local storage, account for persistence
- **As a user, I want to navigate between tools (mulligan sim, hand reader, profile) via a clear top-level menu so that I can find what I need**

## 5. Requirements

### Must-Have (P0) — Mulligan Simulator MVP

**P0-1: Decklist Input & Parsing**
- Accept pasted decklists in common formats: "4 Card Name", "4x Card Name", MTGA export format
- Detect and handle sideboard separator (empty line, "Sideboard", "SB:")
- Main deck only for mulligan simulation (sideboard displayed but not shuffled in)
- Clear error messaging for unparseable lines with best-effort partial parsing
- Acceptance criteria:
  - [ ] Parses "4 Lightning Bolt" correctly
  - [ ] Parses "4x Lightning Bolt" correctly
  - [ ] Parses MTGA format ("4 Lightning Bolt (FDN) 123")
  - [ ] Detects sideboard separator and excludes sideboard from simulation
  - [ ] Shows error for unrecognizable lines while parsing the rest
  - [ ] Handles DFC names (front face lookup)

**P0-2: Scryfall Card Resolution**
- Batch-resolve all card names via Scryfall API on decklist submit
- Cache resolved cards in-memory (and eventually server-side) to avoid redundant lookups
- Handle DFCs correctly: display front face image, store both faces' data
- Show loading state during resolution with progress indicator
- Graceful handling of cards not found (flag them, allow simulation with remaining cards)
- Acceptance criteria:
  - [ ] All unique card names resolved via Scryfall fuzzy match
  - [ ] Rate limiting respected (≤10 req/sec, use Collection endpoint for batch)
  - [ ] DFC cards display front face image
  - [ ] Resolution errors shown per-card without blocking valid cards
  - [ ] Subsequent simulations with same deck don't re-fetch

**P0-3: London Mulligan Simulation**
- Shuffle deck, draw 7 cards, display as card images
- "Keep" button to finalize hand
- "Mulligan" button to shuffle back and draw 7 new cards
- After keeping on a mulligan: show interface to select N cards to put on bottom (N = number of mulligans taken)
- Track mulligan count (0 = kept initial 7, 1 = mulled once, etc.)
- Acceptance criteria:
  - [ ] Initial hand is 7 random cards from the main deck
  - [ ] Mulligan reshuffles and draws fresh 7
  - [ ] After keeping on mull 1, user must bottom 1 card before proceeding
  - [ ] After keeping on mull 2, user must bottom 2 cards
  - [ ] Cards are visually displayed using Scryfall images
  - [ ] Mulligan count displayed clearly

**P0-4: Post-Keep Draw Simulation**
- After keeping (and bottoming if applicable), simulate drawing cards turn by turn
- "Draw" button reveals the next card from the remaining deck
- Display running hand alongside cards drawn each turn
- "New Hand" button to reset and start a new simulation with the same deck
- Acceptance criteria:
  - [ ] Draw pulls from shuffled remaining deck (minus hand and bottomed cards)
  - [ ] Each draw shown as a new card with turn number
  - [ ] Hand state updates to show current hand contents
  - [ ] "New Hand" reshuffles full deck and starts over

**P0-5: Basic Decision Logging (Local)**
- On each keep/mull decision, log: hand contents, decision (keep/mull), mulligan number, timestamp
- Store in localStorage for anonymous users
- Display basic stats: total hands seen, average mulligans, keep rate
- Acceptance criteria:
  - [ ] Each decision persisted to localStorage
  - [ ] Stats page shows aggregate numbers per deck
  - [ ] Data survives page refresh

### Nice-to-Have (P1) — Fast Follows

**P1-1: On Play/Draw Toggle**
- Toggle between "on the play" and "on the draw" before starting
- When on the draw, post-keep simulation draws an extra card on turn 1
- Decision logs tagged with play/draw context

**P1-2: Decision Notes**
- Freeform text field after each keep/mull to record reasoning
- Notes stored with decision log and visible in history

**P1-3: Saved Decklists**
- Save parsed decklists with a user-provided name
- List of saved decks for quick loading
- LocalStorage for anonymous, server-side for authenticated users

**P1-4: Card-Level Mulligan Analytics**
- "Which cards appear most in mulliganed hands?"
- Per-card mulligan correlation: "Hands containing Card X are mulliganed Y% of the time vs Z% baseline"
- Simple table/list view, not fancy visualization

**P1-5: Post-Sideboard Mulligan Practice**
- After loading a deck, allow the user to swap cards between mainboard and sideboard before starting a mulligan session
- UI to move cards in/out (e.g., "-2 Card A, +2 Card B from sideboard")
- Sideboarded configuration used for that session's shuffling/drawing
- Decision logs tagged with "pre-board" or "post-board" context
- Critical for competitive practice: most games in a match are post-sideboard

**P1-6: User Accounts & Data Persistence**
- Email/password and/or OAuth (Google) signup/login
- Migrate localStorage data to server on account creation
- Server-side storage of decklists and decision history
- Acceptance criteria:
  - [ ] User can sign up and log in
  - [ ] LocalStorage data migrated to account on first login
  - [ ] Data syncs across devices when logged in

### Future Considerations (P2) — Design For, Don't Build

**P2-1: Hand Reading Tool**
- Separate tool accessible from main navigation
- Load opponent decklist → mark plays/non-plays per turn → see narrowed hand range
- Needs: fast tap-based UX, turn-by-turn state, probability model
- Architectural implication: shared decklist parsing, card display components, navigation shell must support multiple tools from day one

**P2-2: Matchup-Aware Mulligans**
- Select opponent archetype before mulligan practice
- Hand evaluation considers matchup context
- Architectural implication: need deck archetype/metadata model, probably a curated list of meta decks per format

**P2-3: Mobile Native (iOS)**
- React Native or similar for native app
- Architectural implication: keep business logic in shared TypeScript packages where possible; API-first backend design

**P2-4: Draft/Limited Hand Reading**
- Hand reading without known decklist, using card type / mana value archetypes
- Architectural implication: different data model for "card archetypes" vs specific cards

**P2-5: Aggregate Analytics & Insights**
- Mulligan rate by mana curve shape
- Mulligan rate trends over time
- Cross-deck comparisons
- Architectural implication: needs structured decision data model from day one (P0-5 must be extensible)

## 6. Success Metrics

Since this is a personal/community project rather than a commercial product, success metrics focus on utility and engagement rather than business KPIs.

### Leading Indicators (first 2 weeks after sharing with playgroup)
- **Activation**: Do users complete at least one full mulligan simulation (paste deck → see hand → keep/mull)?
  - Target: 80% of visitors who paste a deck complete at least one decision
- **Session depth**: Average number of hands simulated per session
  - Target: ≥5 hands per session (indicates the tool is useful enough to keep practicing)
- **Return usage**: Do users come back for a second session within a week?
  - Target: 50% of first-time users return

### Lagging Indicators (1-3 months)
- **Deck saves**: Are users saving multiple decklists? (indicates ongoing use)
- **Account creation**: Do users want persistence enough to create accounts?
- **Feature requests**: Are users asking for hand reading / other tools? (validates roadmap)

## 7. Open Questions

### Blocking
- **Scryfall batch endpoint**: Should we use the `/cards/collection` endpoint (POST, up to 75 cards) for initial resolution instead of individual fuzzy lookups? This is significantly more efficient. — **Answer: Yes, use collection endpoint** *(engineering)*
- **Decklist format coverage**: What specific formats do we need beyond "4 Card Name" and MTGA export? Should we support Moxfield/Archidekt URL import? — *(product, non-blocking for MVP — start with paste, URL import is P1)*

### Non-Blocking
- **Randomness quality**: Is `Math.random()` sufficient for shuffling, or should we use `crypto.getRandomValues()`? Doesn't affect outcomes for practice but some users may care. — *(engineering)*
- **Card image sizing**: What size Scryfall images to use? `normal` (488×680) is good quality but may be large for mobile viewports. — *(design/engineering)*
- **Analytics storage schema**: What's the right data model for decision logs that supports both simple stats now and complex analytics later? — *(engineering, resolve during P0-5)*

## 8. Timeline Considerations

### Suggested Phasing

**Phase 1 — Mulligan Simulator MVP (P0s)**
- Decklist parsing + Scryfall resolution
- London mulligan simulation with visual cards
- Post-keep draw simulation
- Basic local decision logging + stats
- App shell with navigation (supporting future tools)

**Phase 2 — Enhanced Mulligan Experience (P1s)**
- Play/draw toggle
- Decision notes
- Saved decklists
- Card-level analytics
- User accounts

**Phase 3 — Hand Reading Tool (P2-1)**
- Design and build hand reading as second tool
- Shared components already in place from Phase 1

**Phase 4 — Mobile & Advanced Features**
- Native mobile app
- Matchup-aware mulligans
- Advanced analytics
