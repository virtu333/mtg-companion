import { create } from 'zustand';
import type { MulliganDecision, DeckMulliganStats } from '@mtg-companion/shared-types';

const STORAGE_KEY = 'mtg-companion:decisions';

function loadDecisions(): MulliganDecision[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistDecisions(decisions: MulliganDecision[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

interface StatsStore {
  decisions: MulliganDecision[];
  recordDecision: (decision: Omit<MulliganDecision, 'id' | 'timestamp'>) => void;
  clearHistory: (deckId?: string) => void;
  getStatsForDeck: (deckId: string) => DeckMulliganStats;
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  decisions: loadDecisions(),

  recordDecision: (partial) => {
    const decision: MulliganDecision = {
      ...partial,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...get().decisions, decision];
    set({ decisions: updated });
    persistDecisions(updated);
  },

  clearHistory: (deckId?) => {
    const updated = deckId
      ? get().decisions.filter((d) => d.deckId !== deckId)
      : [];
    set({ decisions: updated });
    persistDecisions(updated);
  },

  getStatsForDeck: (deckId) => {
    const keeps = get().decisions.filter(
      (d) => d.deckId === deckId && d.decision === 'keep',
    );

    if (keeps.length === 0) {
      return {
        deckId,
        totalHands: 0,
        keepRate: 0,
        averageMulligans: 0,
        mulliganDistribution: {},
      };
    }

    const totalHands = keeps.length;
    const keptFirst = keeps.filter((d) => d.mulliganNumber === 0).length;
    const keepRate = keptFirst / totalHands;
    const totalMulls = keeps.reduce((sum, d) => sum + d.mulliganNumber, 0);
    const averageMulligans = totalMulls / totalHands;

    const mulliganDistribution: Record<number, number> = {};
    for (const k of keeps) {
      mulliganDistribution[k.mulliganNumber] =
        (mulliganDistribution[k.mulliganNumber] ?? 0) + 1;
    }

    return { deckId, totalHands, keepRate, averageMulligans, mulliganDistribution };
  },
}));
