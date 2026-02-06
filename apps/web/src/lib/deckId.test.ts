import { describe, it, expect } from 'vitest';
import { computeDeckId } from './deckId';

describe('computeDeckId', () => {
  const sampleDeck = [
    { name: 'Lightning Bolt', quantity: 4 },
    { name: 'Monastery Swiftspear', quantity: 4 },
    { name: 'Mountain', quantity: 18 },
  ];

  it('returns the same ID for the same input', () => {
    const id1 = computeDeckId(sampleDeck);
    const id2 = computeDeckId(sampleDeck);
    expect(id1).toBe(id2);
  });

  it('is order-independent', () => {
    const shuffled = [sampleDeck[2], sampleDeck[0], sampleDeck[1]];
    expect(computeDeckId(shuffled)).toBe(computeDeckId(sampleDeck));
  });

  it('is case-insensitive', () => {
    const upperCase = sampleDeck.map((e) => ({ ...e, name: e.name.toUpperCase() }));
    expect(computeDeckId(upperCase)).toBe(computeDeckId(sampleDeck));
  });

  it('produces different IDs for different cards', () => {
    const differentDeck = [
      { name: 'Counterspell', quantity: 4 },
      { name: 'Island', quantity: 22 },
    ];
    expect(computeDeckId(differentDeck)).not.toBe(computeDeckId(sampleDeck));
  });

  it('produces different IDs for different quantities', () => {
    const tweaked = sampleDeck.map((e) =>
      e.name === 'Mountain' ? { ...e, quantity: 20 } : e,
    );
    expect(computeDeckId(tweaked)).not.toBe(computeDeckId(sampleDeck));
  });

  it('returns a valid 8-char hex string for empty mainboard', () => {
    const id = computeDeckId([]);
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });

  it('returns an 8-char hex string', () => {
    const id = computeDeckId(sampleDeck);
    expect(id).toMatch(/^[0-9a-f]{8}$/);
  });
});
