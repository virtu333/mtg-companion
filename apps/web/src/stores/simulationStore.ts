import { create } from 'zustand';
import type { ResolvedCard, SimulationPhase } from '@mtg-companion/shared-types';

interface DrawnCard {
  turn: number;
  card: ResolvedCard;
}

interface SimulationStore {
  // State
  phase: SimulationPhase;
  library: ResolvedCard[];
  hand: ResolvedCard[];
  mulliganCount: number;
  bottomedCards: ResolvedCard[];
  drawnCards: DrawnCard[];
  turnNumber: number;

  // Actions
  startNewHand: (deckCards: ResolvedCard[]) => void;
  mulligan: () => void;
  keep: () => void;
  bottomCards: (cards: ResolvedCard[]) => void;
  drawCard: () => void;
  reset: () => void;
}

/** Fisher-Yates shuffle (in place, returns same array) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  phase: 'idle',
  library: [],
  hand: [],
  mulliganCount: 0,
  bottomedCards: [],
  drawnCards: [],
  turnNumber: 0,

  startNewHand: (deckCards) => {
    const library = shuffle([...deckCards]);
    const hand = library.splice(0, 7);
    set({
      phase: 'deciding',
      library,
      hand,
      mulliganCount: 0,
      bottomedCards: [],
      drawnCards: [],
      turnNumber: 0,
    });
  },

  mulligan: () => {
    const { hand, library, mulliganCount } = get();
    // Put hand back into library and reshuffle
    const fullLibrary = shuffle([...library, ...hand]);
    const newHand = fullLibrary.splice(0, 7);
    set({
      phase: 'deciding',
      library: fullLibrary,
      hand: newHand,
      mulliganCount: mulliganCount + 1,
    });
  },

  keep: () => {
    const { mulliganCount } = get();
    if (mulliganCount > 0) {
      // Need to bottom N cards
      set({ phase: 'bottoming' });
    } else {
      // No cards to bottom, go straight to playing
      set({ phase: 'playing', turnNumber: 1 });
    }
  },

  bottomCards: (cards) => {
    const { hand, library } = get();
    const bottomedSet = new Set(cards);
    const remainingHand = hand.filter((c) => !bottomedSet.has(c));
    // Put bottomed cards on bottom of library
    const newLibrary = [...library, ...cards];
    set({
      phase: 'playing',
      hand: remainingHand,
      library: newLibrary,
      bottomedCards: cards,
      turnNumber: 1,
    });
  },

  drawCard: () => {
    const { library, drawnCards, turnNumber } = get();
    if (library.length === 0) return;

    const newLibrary = [...library];
    const drawn = newLibrary.shift()!;
    set({
      library: newLibrary,
      drawnCards: [...drawnCards, { turn: turnNumber + 1, card: drawn }],
      turnNumber: turnNumber + 1,
    });
  },

  reset: () => {
    set({
      phase: 'idle',
      library: [],
      hand: [],
      mulliganCount: 0,
      bottomedCards: [],
      drawnCards: [],
      turnNumber: 0,
    });
  },
}));
