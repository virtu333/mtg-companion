import { create } from 'zustand';
import { parseDecklist } from '@mtg-companion/deck-parser';
import type { ParseResult, ResolvedCard, SavedDeck } from '@mtg-companion/shared-types';
import { resolveCards } from '../lib/api';
import { computeDeckId } from '../lib/deckId';

export type ResolveStatus = 'idle' | 'loading' | 'done' | 'error';

interface DeckStore {
  // State
  rawInput: string;
  parseResult: ParseResult | null;
  resolvedCards: ResolvedCard[];
  notFound: string[];
  /** Maps input names to resolved Scryfall names when they differ */
  aliases: Record<string, string>;
  resolveStatus: ResolveStatus;
  resolveError: string | null;
  deckId: string | null;

  // Actions
  setRawInput: (input: string) => void;
  parse: () => ParseResult;
  resolve: () => Promise<void>;
  loadSavedDeck: (saved: SavedDeck) => void;
  clear: () => void;
}

// Track the current AbortController outside the store to avoid serialization issues
let currentAbortController: AbortController | null = null;

export const useDeckStore = create<DeckStore>((set, get) => ({
  rawInput: '',
  parseResult: null,
  resolvedCards: [],
  notFound: [],
  aliases: {},
  resolveStatus: 'idle',
  resolveError: null,
  deckId: null,

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

    // Abort any in-flight request
    currentAbortController?.abort();
    const controller = new AbortController();
    currentAbortController = controller;

    // Parse first
    const parseResult = parseDecklist(rawInput);
    set({ parseResult, resolveStatus: 'loading', resolveError: null });

    const allEntries = [...parseResult.mainboard, ...parseResult.sideboard];
    if (allEntries.length === 0) {
      set({ resolveStatus: 'done', resolvedCards: [], notFound: [] });
      return;
    }

    try {
      const response = await resolveCards(allEntries, controller.signal);
      // Only update if this is still the active request
      if (currentAbortController === controller) {
        set({
          resolvedCards: response.resolved,
          notFound: response.notFound,
          aliases: response.aliases ?? {},
          resolveStatus: 'done',
          deckId: computeDeckId(parseResult.mainboard),
        });
      }
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (currentAbortController === controller) {
        set({
          resolveStatus: 'error',
          resolveError: err instanceof Error ? err.message : 'Failed to resolve cards',
        });
      }
    }
  },

  loadSavedDeck: (saved) => {
    currentAbortController?.abort();
    currentAbortController = null;
    set({
      rawInput: saved.rawInput,
      parseResult: saved.parseResult,
      resolvedCards: saved.resolvedCards,
      notFound: saved.notFound,
      aliases: saved.aliases,
      resolveStatus: 'done',
      resolveError: null,
      deckId: saved.id,
    });
  },

  clear: () => {
    currentAbortController?.abort();
    currentAbortController = null;
    set({
      rawInput: '',
      parseResult: null,
      resolvedCards: [],
      notFound: [],
      aliases: {},
      resolveStatus: 'idle',
      resolveError: null,
      deckId: null,
    });
  },
}));
