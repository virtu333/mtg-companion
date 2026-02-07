// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useDeckLibraryStore } from './deckLibraryStore';

const STORAGE_KEY = 'mtg-companion:saved-decks';

function makeSaveDeckInput(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deck-abc',
    rawInput: '4 Lightning Bolt\n20 Mountain',
    parseResult: {
      mainboard: [
        { name: 'Lightning Bolt', quantity: 4 },
        { name: 'Mountain', quantity: 20 },
      ],
      sideboard: [],
      errors: [],
    },
    resolvedCards: [],
    aliases: {},
    notFound: [],
    ...overrides,
  };
}

describe('deckLibraryStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDeckLibraryStore.setState({ decks: [] });
  });

  it('saveDeck adds a deck', () => {
    useDeckLibraryStore.getState().saveDeck('Mono Red', makeSaveDeckInput());
    const decks = useDeckLibraryStore.getState().decks;
    expect(decks).toHaveLength(1);
    expect(decks[0].name).toBe('Mono Red');
    expect(decks[0].id).toBe('deck-abc');
    expect(decks[0].savedAt).toBeTruthy();
    expect(decks[0].lastUsedAt).toBeTruthy();
  });

  it('saveDeck upserts (same id updates name/data)', () => {
    const store = useDeckLibraryStore.getState();
    store.saveDeck('Mono Red v1', makeSaveDeckInput());
    useDeckLibraryStore.getState().saveDeck('Mono Red v2', makeSaveDeckInput());
    const decks = useDeckLibraryStore.getState().decks;
    expect(decks).toHaveLength(1);
    expect(decks[0].name).toBe('Mono Red v2');
  });

  it('deleteDeck removes a deck', () => {
    useDeckLibraryStore.getState().saveDeck('Mono Red', makeSaveDeckInput());
    expect(useDeckLibraryStore.getState().decks).toHaveLength(1);
    useDeckLibraryStore.getState().deleteDeck('deck-abc');
    expect(useDeckLibraryStore.getState().decks).toHaveLength(0);
  });

  it('renameDeck updates the name', () => {
    useDeckLibraryStore.getState().saveDeck('Old Name', makeSaveDeckInput());
    useDeckLibraryStore.getState().renameDeck('deck-abc', 'New Name');
    expect(useDeckLibraryStore.getState().decks[0].name).toBe('New Name');
  });

  it('persists to localStorage', () => {
    useDeckLibraryStore.getState().saveDeck('Mono Red', makeSaveDeckInput());
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Mono Red');
  });

  it('loads from localStorage on init', () => {
    const existing = [{
      ...makeSaveDeckInput(),
      name: 'Stored Deck',
      savedAt: '2025-01-01T00:00:00Z',
      lastUsedAt: '2025-01-01T00:00:00Z',
    }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    // Simulate re-init by loading from localStorage
    useDeckLibraryStore.setState({
      decks: JSON.parse(localStorage.getItem(STORAGE_KEY)!),
    });
    expect(useDeckLibraryStore.getState().decks).toHaveLength(1);
    expect(useDeckLibraryStore.getState().decks[0].name).toBe('Stored Deck');
  });

  it('handles missing localStorage gracefully', () => {
    // localStorage is clear from beforeEach
    expect(useDeckLibraryStore.getState().decks).toEqual([]);
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    const loaded = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    useDeckLibraryStore.setState({ decks: loaded });
    expect(useDeckLibraryStore.getState().decks).toEqual([]);
  });

  it('updateLastUsed updates the timestamp', () => {
    useDeckLibraryStore.getState().saveDeck('Mono Red', makeSaveDeckInput());
    const before = useDeckLibraryStore.getState().decks[0].lastUsedAt;
    // Small delay to ensure timestamp differs
    useDeckLibraryStore.getState().updateLastUsed('deck-abc');
    const after = useDeckLibraryStore.getState().decks[0].lastUsedAt;
    expect(after).toBeTruthy();
    expect(new Date(after).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });
});
