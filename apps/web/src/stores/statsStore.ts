import { create } from 'zustand';
import type { MulliganDecision, DeckMulliganStats } from '@mtg-companion/shared-types';
import { saveDecisionsToServer, clearDecisionsOnServer } from '../lib/api';

const STORAGE_KEY = 'mtg-companion:decisions';

type GetTokenFn = () => Promise<string | null>;

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

/** Fire-and-forget server sync */
async function syncToServer(getToken: GetTokenFn | null, action: (token: string) => Promise<void>) {
  if (!getToken) return;
  try {
    const token = await getToken();
    if (token) await action(token);
  } catch (err) {
    console.error('Server sync failed:', err);
  }
}

interface StatsStore {
  decisions: MulliganDecision[];
  _getToken: GetTokenFn | null;
  recordDecision: (decision: Omit<MulliganDecision, 'id' | 'timestamp'>) => void;
  clearHistory: (deckId?: string) => void;
  getStatsForDeck: (deckId: string) => DeckMulliganStats;
  setDecisions: (decisions: MulliganDecision[]) => void;
  setGetToken: (fn: GetTokenFn | null) => void;
  reloadFromLocalStorage: () => void;
}

export const useStatsStore = create<StatsStore>((set, get) => ({
  decisions: loadDecisions(),
  _getToken: null,

  recordDecision: (partial) => {
    const decision: MulliganDecision = {
      ...partial,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...get().decisions, decision];
    set({ decisions: updated });
    persistDecisions(updated);
    syncToServer(get()._getToken, (token) => saveDecisionsToServer([decision], token));
  },

  clearHistory: (deckId?) => {
    const updated = deckId
      ? get().decisions.filter((d) => d.deckId !== deckId)
      : [];
    set({ decisions: updated });
    persistDecisions(updated);
    syncToServer(get()._getToken, (token) => clearDecisionsOnServer(token, deckId));
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

  setDecisions: (decisions) => {
    set({ decisions });
    persistDecisions(decisions);
  },

  setGetToken: (fn) => {
    set({ _getToken: fn });
  },

  reloadFromLocalStorage: () => {
    set({ decisions: loadDecisions() });
  },
}));
