import { create } from 'zustand';
import type { SavedDeck, ParseResult, ResolvedCard } from '@mtg-companion/shared-types';
import { saveDeckToServer, deleteDeckFromServer, renameDeckOnServer } from '../lib/api';

const STORAGE_KEY = 'mtg-companion:saved-decks';

type GetTokenFn = () => Promise<string | null>;

function loadDecks(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistDecks(decks: SavedDeck[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  } catch {
    // QuotaExceededError — silently fail
  }
}

interface SaveDeckInput {
  id: string;
  rawInput: string;
  parseResult: ParseResult;
  resolvedCards: ResolvedCard[];
  aliases: Record<string, string>;
  notFound: string[];
}

interface DeckLibraryStore {
  decks: SavedDeck[];
  _getToken: GetTokenFn | null;
  saveDeck: (name: string, data: SaveDeckInput) => void;
  deleteDeck: (id: string) => void;
  renameDeck: (id: string, name: string) => void;
  updateLastUsed: (id: string) => void;
  setDecks: (decks: SavedDeck[]) => void;
  setGetToken: (fn: GetTokenFn | null) => void;
  reloadFromLocalStorage: () => void;
}

/** Fire-and-forget server sync — errors are logged, not thrown */
async function syncToServer(getToken: GetTokenFn | null, action: (token: string) => Promise<void>) {
  if (!getToken) return;
  try {
    const token = await getToken();
    if (token) await action(token);
  } catch (err) {
    console.error('Server sync failed:', err);
  }
}

export const useDeckLibraryStore = create<DeckLibraryStore>((set, get) => ({
  decks: loadDecks(),
  _getToken: null,

  saveDeck: (name, data) => {
    const now = new Date().toISOString();
    const existing = get().decks;
    const idx = existing.findIndex((d) => d.id === data.id);
    const deck: SavedDeck = {
      id: data.id,
      name,
      rawInput: data.rawInput,
      parseResult: data.parseResult,
      resolvedCards: data.resolvedCards,
      aliases: data.aliases,
      notFound: data.notFound,
      savedAt: now,
      lastUsedAt: now,
    };

    let updated: SavedDeck[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = deck;
    } else {
      updated = [...existing, deck];
    }
    set({ decks: updated });
    persistDecks(updated);
    syncToServer(get()._getToken, (token) => saveDeckToServer(deck, token));
  },

  deleteDeck: (id) => {
    const updated = get().decks.filter((d) => d.id !== id);
    set({ decks: updated });
    persistDecks(updated);
    syncToServer(get()._getToken, (token) => deleteDeckFromServer(id, token));
  },

  renameDeck: (id, name) => {
    const updated = get().decks.map((d) => (d.id === id ? { ...d, name } : d));
    set({ decks: updated });
    persistDecks(updated);
    syncToServer(get()._getToken, (token) => renameDeckOnServer(id, name, token));
  },

  updateLastUsed: (id) => {
    const now = new Date().toISOString();
    const updated = get().decks.map((d) => (d.id === id ? { ...d, lastUsedAt: now } : d));
    set({ decks: updated });
    persistDecks(updated);
  },

  setDecks: (decks) => {
    set({ decks });
    persistDecks(decks);
  },

  setGetToken: (fn) => {
    set({ _getToken: fn });
  },

  reloadFromLocalStorage: () => {
    set({ decks: loadDecks() });
  },
}));
