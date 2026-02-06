# Hand Reading Tool — Feature Spec (v2)

> This feature is planned for Phase 3. This spec captures current thinking to inform architectural decisions in Phase 1.

## Problem Statement

During competitive MTG matches, skilled players mentally track what cards an opponent is likely holding based on observed plays and non-plays. This "hand reading" skill is developed only through experience and is typically done mentally or with pen/paper. No tool exists to support this process systematically.

Players practicing hand reading during online matches (MTGA, MTGO, or webcam paper) have enough time between plays to use a companion tool, especially in competitive formats where decision quality matters more than speed.

## Core Workflow

1. **Load opponent's decklist** — paste or select from saved lists
2. **Turn-by-turn tracking** — each turn, user marks:
   - Cards played (removed from hand range)
   - Cards drawn (increment unknown cards in hand)
   - Non-plays that provide information (e.g., no 1-drop on T1)
3. **View narrowed range** — see most likely cards remaining in opponent's hand, ranked by probability

## Key UX Considerations

- **Speed is critical** — this is used during a game. Every interaction should be a single tap/click.
- **Card grid layout** — show full decklist as a grid. Cards played get visually crossed out. Cards flagged as "not in hand" get dimmed.
- **Turn timeline** — sidebar or bottom bar showing what happened each turn for reference
- **Undo** — easy to undo last action (misclicks happen during games)

## Probability Model (Initial — Simple)

For MVP of hand reading, use a simple inclusion/exclusion model rather than full Bayesian inference:

- **In hand (confirmed)**: cards revealed but not yet played (e.g., opponent revealed hand to an effect)
- **Played**: cards that have been cast or put onto the battlefield — removed from hand
- **Not in hand (high confidence)**: cards flagged by user based on non-plays (e.g., didn't play 1-drop on T1)
- **Unknown**: remaining cards — could be in hand or library
- **Most likely in hand**: from the "unknown" pool, ranked by: number of copies remaining in deck, whether they would have been played by now if drawn

Advanced probability modeling (Bayesian updates, conditional probabilities based on play patterns) is a future enhancement.

## Data Model

```typescript
interface HandReadingSession {
  id: string;
  opponentDeckId: string;
  turns: TurnRecord[];
  createdAt: string;
}

interface TurnRecord {
  turnNumber: number;
  cardsPlayed: string[];      // scryfallIds
  landsPlayed: string[];
  nonPlayFlags: NonPlayFlag[];
  opponentDrew: boolean;      // true on their draw step (always true except T1 on play)
}

interface NonPlayFlag {
  cardCategory: string;       // "1-drop creature", specific card name, or mana value
  confidence: 'high' | 'medium' | 'low';
  reason: string;             // user note or auto-generated
}
```

## Shared Components with Mulligan Simulator
- Decklist parsing and input
- Scryfall card resolution
- `CardImage` component
- Navigation shell
- Saved decklists (when available)

## Open Questions
- Should non-play flags be per-card or per-category? Per-category is faster UX ("no 1-drops") but less precise.
- How to handle cards that could be in hand but player chose not to play (sandbagging)? For now, user decides — tool doesn't auto-flag.
- Should there be pre-built heuristic rules? E.g., "if opponent passes T1 with untapped red source, auto-flag 1-drop creatures as unlikely." This is a nice-to-have.
