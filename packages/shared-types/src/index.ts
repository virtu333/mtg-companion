// ── Card & Deck Types ──────────────────────────────────────────────

/** MTG color identity */
export type MtgColor = 'W' | 'U' | 'B' | 'R' | 'G';

/** Card as resolved from Scryfall, trimmed to what we need */
export interface ResolvedCard {
  scryfallId: string;
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  power?: string;
  toughness?: string;
  colors: MtgColor[];
  imageUri: string;
  backImageUri?: string;
  cmc: number;
}

/** A single entry in a decklist (card + quantity) */
export interface DeckEntry {
  quantity: number;
  card: ResolvedCard;
}

/** A fully resolved decklist */
export interface Deck {
  id: string;
  name: string;
  format?: string;
  mainboard: DeckEntry[];
  sideboard: DeckEntry[];
  createdAt: string;
  updatedAt: string;
}

// ── Deck Parser Types ──────────────────────────────────────────────

/** A parsed card entry before Scryfall resolution */
export interface ParsedDeckEntry {
  name: string;
  quantity: number;
}

/** Result returned by parseDecklist() */
export interface ParseResult {
  mainboard: ParsedDeckEntry[];
  sideboard: ParsedDeckEntry[];
  errors: ParseError[];
}

/** A line that the parser couldn't interpret */
export interface ParseError {
  line: number;
  text: string;
  reason: string;
}

// ── Simulation Instance Types ─────────────────────────────────────

/** A card instance in the simulation with a unique ID to distinguish duplicates */
export interface CardInstance {
  instanceId: number;
  card: ResolvedCard;
}

/** A drawn card with the turn it was drawn on */
export interface DrawnCard {
  turn: number;
  card: CardInstance;
}

// ── Mulligan Simulation Types ──────────────────────────────────────

/** A single mulligan decision record */
export interface MulliganDecision {
  id: string;
  deckId: string;
  timestamp: string;
  handCards: string[];
  decision: 'keep' | 'mulligan';
  mulliganNumber: number;
  bottomedCards?: string[];
  onPlay: boolean;
  notes?: string;
}

/** Aggregate stats computed from decision history */
export interface DeckMulliganStats {
  deckId: string;
  totalHands: number;
  keepRate: number;
  averageMulligans: number;
  mulliganDistribution: Record<number, number>;
}

// ── Simulation State ───────────────────────────────────────────────

export type SimulationPhase = 'idle' | 'deciding' | 'bottoming' | 'playing';

// ── Saved Deck Types ─────────────────────────────────────────────

/** A saved decklist stored in localStorage */
export interface SavedDeck {
  id: string;
  name: string;
  rawInput: string;
  parseResult: ParseResult;
  resolvedCards: ResolvedCard[];
  aliases: Record<string, string>;
  notFound: string[];
  savedAt: string;
  lastUsedAt: string;
}
