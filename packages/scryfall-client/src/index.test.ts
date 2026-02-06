import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ScryfallClient, _mapScryfallCard } from './index';
import type { _ScryfallCard } from './index';

// ── Fixtures ───────────────────────────────────────────────────────

function makeScryfallCard(overrides: Partial<_ScryfallCard> = {}): _ScryfallCard {
  return {
    id: 'abc-123',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    colors: ['R'],
    cmc: 1,
    image_uris: { normal: 'https://cards.scryfall.io/normal/lightning-bolt.jpg' },
    ...overrides,
  };
}

function makeDFCCard(): _ScryfallCard {
  return {
    id: 'dfc-456',
    name: 'Bloodsoaked Insight // Sanguine Morass',
    type_line: 'Sorcery // Land',
    cmc: 3,
    card_faces: [
      {
        name: 'Bloodsoaked Insight',
        mana_cost: '{1}{U}{B}',
        type_line: 'Sorcery',
        oracle_text: 'Draw two cards.',
        colors: ['U', 'B'],
        image_uris: { normal: 'https://cards.scryfall.io/normal/bloodsoaked-front.jpg' },
      },
      {
        name: 'Sanguine Morass',
        type_line: 'Land',
        oracle_text: '{T}: Add {U} or {B}.',
        image_uris: { normal: 'https://cards.scryfall.io/normal/sanguine-back.jpg' },
      },
    ],
  };
}

function mockFetchSuccess(data: _ScryfallCard[], notFound: string[] = []) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        data,
        not_found: notFound.map((name) => ({ name })),
      }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────

describe('mapScryfallCard', () => {
  it('maps a normal card', () => {
    const sc = makeScryfallCard();
    const card = _mapScryfallCard(sc);
    expect(card).toEqual({
      scryfallId: 'abc-123',
      name: 'Lightning Bolt',
      manaCost: '{R}',
      typeLine: 'Instant',
      oracleText: 'Lightning Bolt deals 3 damage to any target.',
      power: undefined,
      toughness: undefined,
      colors: ['R'],
      imageUri: 'https://cards.scryfall.io/normal/lightning-bolt.jpg',
      backImageUri: undefined,
      cmc: 1,
    });
  });

  it('maps a creature with power/toughness', () => {
    const sc = makeScryfallCard({
      name: 'Goblin Guide',
      type_line: 'Creature — Goblin Scout',
      power: '2',
      toughness: '2',
    });
    const card = _mapScryfallCard(sc);
    expect(card.power).toBe('2');
    expect(card.toughness).toBe('2');
  });

  it('maps a DFC using front face data', () => {
    const sc = makeDFCCard();
    const card = _mapScryfallCard(sc);
    expect(card.name).toBe('Bloodsoaked Insight // Sanguine Morass');
    expect(card.manaCost).toBe('{1}{U}{B}');
    expect(card.typeLine).toBe('Sorcery');
    expect(card.oracleText).toBe('Draw two cards.');
    expect(card.colors).toEqual(['U', 'B']);
    expect(card.imageUri).toBe('https://cards.scryfall.io/normal/bloodsoaked-front.jpg');
    expect(card.backImageUri).toBe('https://cards.scryfall.io/normal/sanguine-back.jpg');
  });
});

describe('ScryfallClient', () => {
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchFn = mockFetchSuccess([makeScryfallCard()]);
  });

  it('resolves a single card', async () => {
    const client = new ScryfallClient({ fetchFn });
    const result = await client.resolveCards(['Lightning Bolt']);

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(result.resolved.size).toBe(1);
    expect(result.resolved.get('Lightning Bolt')?.scryfallId).toBe('abc-123');
    expect(result.notFound).toEqual([]);
  });

  it('deduplicates names', async () => {
    const client = new ScryfallClient({ fetchFn });
    await client.resolveCards(['Lightning Bolt', 'Lightning Bolt', 'Lightning Bolt']);

    const body = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(body.identifiers).toEqual([{ name: 'Lightning Bolt' }]);
  });

  it('returns not-found cards', async () => {
    fetchFn = mockFetchSuccess([], ['Misspelled Card']);
    const client = new ScryfallClient({ fetchFn });
    const result = await client.resolveCards(['Misspelled Card']);

    expect(result.resolved.size).toBe(0);
    expect(result.notFound).toEqual(['Misspelled Card']);
  });

  it('caches results and skips fetch on second call', async () => {
    const client = new ScryfallClient({ fetchFn });

    await client.resolveCards(['Lightning Bolt']);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await client.resolveCards(['Lightning Bolt']);
    expect(fetchFn).toHaveBeenCalledTimes(1); // no second fetch
  });

  it('re-fetches after cache expires', async () => {
    const client = new ScryfallClient({ fetchFn, cacheTtlMs: 0 });

    await client.resolveCards(['Lightning Bolt']);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // TTL is 0ms, so cache is already expired
    await client.resolveCards(['Lightning Bolt']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('clears cache', async () => {
    const client = new ScryfallClient({ fetchFn });

    await client.resolveCards(['Lightning Bolt']);
    client.clearCache();
    await client.resolveCards(['Lightning Bolt']);

    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('splits into batches of 75', async () => {
    const names = Array.from({ length: 100 }, (_, i) => `Card ${i}`);
    const allCards = names.map((name, i) =>
      makeScryfallCard({ id: `id-${i}`, name }),
    );

    // Return correct cards for each batch
    fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: allCards.slice(0, 75), not_found: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ data: allCards.slice(75), not_found: [] }),
      });

    const client = new ScryfallClient({ fetchFn });
    const result = await client.resolveCards(names);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    // First batch: 75 identifiers
    const batch1 = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(batch1.identifiers).toHaveLength(75);
    // Second batch: 25 identifiers
    const batch2 = JSON.parse(fetchFn.mock.calls[1][1].body);
    expect(batch2.identifiers).toHaveLength(25);
    expect(result.resolved.size).toBe(100);
  });

  it('throws on non-ok response', async () => {
    fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    const client = new ScryfallClient({ fetchFn });
    await expect(client.resolveCards(['Lightning Bolt'])).rejects.toThrow(
      'Scryfall API error: 429 Too Many Requests',
    );
  });

  it('sends correct headers', async () => {
    const client = new ScryfallClient({ fetchFn });
    await client.resolveCards(['Lightning Bolt']);

    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.scryfall.com/cards/collection');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['User-Agent']).toBe('MTGCompanion/0.1');
  });

  it('handles mix of cached and uncached cards', async () => {
    const bolt = makeScryfallCard({ id: 'bolt-1', name: 'Lightning Bolt' });
    const guide = makeScryfallCard({ id: 'guide-1', name: 'Goblin Guide' });

    fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [bolt], not_found: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [guide], not_found: [] }),
      });

    const client = new ScryfallClient({ fetchFn });

    // First call caches bolt
    await client.resolveCards(['Lightning Bolt']);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Second call: bolt from cache, guide needs fetch
    const result = await client.resolveCards(['Lightning Bolt', 'Goblin Guide']);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Second fetch should only request Goblin Guide
    const body = JSON.parse(fetchFn.mock.calls[1][1].body);
    expect(body.identifiers).toEqual([{ name: 'Goblin Guide' }]);

    expect(result.resolved.size).toBe(2);
    expect(result.resolved.get('Lightning Bolt')?.scryfallId).toBe('bolt-1');
    expect(result.resolved.get('Goblin Guide')?.scryfallId).toBe('guide-1');
  });
});
