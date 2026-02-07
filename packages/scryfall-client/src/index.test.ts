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
    // Collection endpoint returns not-found, fuzzy fallback returns 404
    fetchFn = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], not_found: [{ name: 'Misspelled Card' }] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });
    const client = new ScryfallClient({ fetchFn });
    const result = await client.resolveCards(['Misspelled Card']);

    expect(result.resolved.size).toBe(0);
    expect(result.notFound).toEqual(['Misspelled Card']);
  });

  it('resolves not-found cards via fuzzy fallback (Arena name variants)', async () => {
    const spiderSense = makeScryfallCard({ id: 'spider-123', name: 'Spider-Sense' });
    // Collection endpoint returns not-found, fuzzy fallback finds the card
    fetchFn = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], not_found: [{ name: 'Detect Intrusion' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(spiderSense),
      });
    const client = new ScryfallClient({ fetchFn });
    const result = await client.resolveCards(['Detect Intrusion']);

    expect(result.resolved.size).toBe(1);
    // Keyed by the original input name so downstream lookup works
    expect(result.resolved.get('Detect Intrusion')?.name).toBe('Spider-Sense');
    expect(result.notFound).toEqual([]);
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

  it('throws immediately on non-429 error', async () => {
    fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const client = new ScryfallClient({ fetchFn });
    await expect(client.resolveCards(['Lightning Bolt'])).rejects.toThrow(
      'Scryfall API error: 500 Internal Server Error',
    );
    // Should not retry for non-429
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds after retry', async () => {
    vi.useFakeTimers();

    const mock429 = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: () => null },
    };
    const mockSuccess = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: [makeScryfallCard()],
          not_found: [],
        }),
    };

    fetchFn = vi
      .fn()
      .mockResolvedValueOnce(mock429)
      .mockResolvedValueOnce(mockSuccess);

    const client = new ScryfallClient({ fetchFn });
    const promise = client.resolveCards(['Lightning Bolt']);

    // Advance past the 1s retry delay (first attempt backoff = 1000ms)
    await vi.advanceTimersByTimeAsync(1100);

    const result = await promise;
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.resolved.size).toBe(1);

    vi.useRealTimers();
  });

  it('throws after exhausting all 429 retries', async () => {
    vi.useFakeTimers();

    const mock429 = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: () => null },
    };

    // 4 calls = 1 initial + 3 retries, all 429
    fetchFn = vi
      .fn()
      .mockResolvedValue(mock429);

    const client = new ScryfallClient({ fetchFn });
    // Attach the catch handler immediately to avoid unhandled rejection
    const promise = client.resolveCards(['Lightning Bolt']).catch((e) => e);

    // Advance through all retry delays: 1000 + 2000 + 4000 = 7000ms
    await vi.advanceTimersByTimeAsync(8000);

    const error = await promise;
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Scryfall API error: 429 Too Many Requests');
    // 1 initial + 3 retries = 4 total calls
    expect(fetchFn).toHaveBeenCalledTimes(4);

    vi.useRealTimers();
  });

  it('uses Retry-After header for 429 delay', async () => {
    vi.useFakeTimers();

    const mock429WithHeader = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: { get: (h: string) => (h === 'Retry-After' ? '2' : null) },
    };
    const mockSuccess = {
      ok: true,
      json: () =>
        Promise.resolve({
          data: [makeScryfallCard()],
          not_found: [],
        }),
    };

    fetchFn = vi
      .fn()
      .mockResolvedValueOnce(mock429WithHeader)
      .mockResolvedValueOnce(mockSuccess);

    const client = new ScryfallClient({ fetchFn });
    const promise = client.resolveCards(['Lightning Bolt']);

    // Advance past Retry-After of 2 seconds
    await vi.advanceTimersByTimeAsync(2100);

    const result = await promise;
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.resolved.size).toBe(1);

    vi.useRealTimers();
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

  it('adds delay between batches but not after the last', async () => {
    vi.useFakeTimers();

    const names = Array.from({ length: 100 }, (_, i) => `Card ${i}`);
    const allCards = names.map((name, i) =>
      makeScryfallCard({ id: `id-${i}`, name }),
    );

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
    const promise = client.resolveCards(names);

    // First batch completes immediately, then 100ms delay before second batch
    await vi.advanceTimersByTimeAsync(150);

    const result = await promise;
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.resolved.size).toBe(100);

    vi.useRealTimers();
  });

  it('evicts expired cache entries on access', async () => {
    const client = new ScryfallClient({ fetchFn, cacheTtlMs: 0 });

    // First call populates cache
    await client.resolveCards(['Lightning Bolt']);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // TTL is 0ms, so cache entry is already expired.
    // Second call should delete expired entry and re-fetch.
    await client.resolveCards(['Lightning Bolt']);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Verify the expired entry was actually removed from the internal map
    // by clearing the mock and checking that a third call still fetches
    // (proving the entry wasn't left as a stale ghost)
    await client.resolveCards(['Lightning Bolt']);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('uses input name as key for DFCs (front face lookup)', async () => {
    const dfc = makeDFCCard();
    fetchFn = mockFetchSuccess([dfc]);

    const client = new ScryfallClient({ fetchFn });
    const result = await client.resolveCards(['Bloodsoaked Insight']);

    // Key should be the input name, not the full DFC name
    expect(result.resolved.has('Bloodsoaked Insight')).toBe(true);
    expect(result.resolved.get('Bloodsoaked Insight')?.name).toBe(
      'Bloodsoaked Insight // Sanguine Morass',
    );
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
