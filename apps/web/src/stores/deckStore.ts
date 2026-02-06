import { create } from 'zustand';
import { parseDecklist } from '@mtg-companion/deck-parser';
import type { ParseResult, ResolvedCard } from '@mtg-companion/shared-types';
import { resolveCards } from '../lib/api';

export type ResolveStatus = 'idle' | 'loading' | 'done' | 'error';

interface DeckStore {
  // State
  rawInput: string;
  parseResult: ParseResult | null;
  resolvedCards: ResolvedCard[];
  notFound: string[];
  resolveStatus: ResolveStatus;
  resolveError: string | null;

  // Actions
  setRawInput: (input: string) => void;
  parse: () => ParseResult;
  resolve: () => Promise<void>;
  clear: () => void;
}

export const useDeckStore = create<DeckStore>((set, get) => ({
  rawInput: '',
  parseResult: null,
  resolvedCards: [],
  notFound: [],
  resolveStatus: 'idle',
  resolveError: null,

  setRawInput: (input) => {
    set({ rawInput: input, resolveStatus: 'idle', resolveError: null });
  },

  parse: () => {
    const result = parseDecklist(get().rawInput);
    set({ parseResult: result });
    return result;
  },

  resolve: async () => {
    const { rawInput } = get();
    if (!rawInput.trim()) return;

    // Parse first
    const parseResult = parseDecklist(rawInput);
    set({ parseResult, resolveStatus: 'loading', resolveError: null });

    const allEntries = [...parseResult.mainboard, ...parseResult.sideboard];
    if (allEntries.length === 0) {
      set({ resolveStatus: 'done', resolvedCards: [], notFound: [] });
      return;
    }

    try {
      const response = await resolveCards(allEntries);
      set({
        resolvedCards: response.resolved,
        notFound: response.notFound,
        resolveStatus: 'done',
      });
    } catch (err) {
      set({
        resolveStatus: 'error',
        resolveError: err instanceof Error ? err.message : 'Failed to resolve cards',
      });
    }
  },

  clear: () => {
    set({
      rawInput: '',
      parseResult: null,
      resolvedCards: [],
      notFound: [],
      resolveStatus: 'idle',
      resolveError: null,
    });
  },
}));
