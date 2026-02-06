import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { ResolvedCard } from '@mtg-companion/shared-types';

// Mock the scryfall-client before importing the app
const mockResolveCards = vi.fn();

vi.mock('@mtg-companion/scryfall-client', () => ({
  ScryfallClient: vi.fn().mockImplementation(() => ({
    resolveCards: mockResolveCards,
  })),
}));

// Import app after mocks are set up
const { default: app } = await import('../app.js');

const fakeCard: ResolvedCard = {
  scryfallId: 'abc-123',
  name: 'Lightning Bolt',
  manaCost: '{R}',
  typeLine: 'Instant',
  oracleText: 'Lightning Bolt deals 3 damage to any target.',
  colors: ['R'],
  imageUri: 'https://cards.scryfall.io/normal/front/a/b/abc.jpg',
  cmc: 1,
};

describe('API integration tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('returns 200 with { status: "ok" }', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('POST /api/cards/resolve', () => {
    it('with valid cards returns resolved cards', async () => {
      const resolvedMap = new Map<string, ResolvedCard>();
      resolvedMap.set('Lightning Bolt', fakeCard);

      mockResolveCards.mockResolvedValue({
        resolved: resolvedMap,
        notFound: [],
      });

      const res = await request(app)
        .post('/api/cards/resolve')
        .send({ cards: [{ name: 'Lightning Bolt', quantity: 4 }] });

      expect(res.status).toBe(200);
      expect(res.body.resolved).toHaveLength(1);
      expect(res.body.resolved[0].name).toBe('Lightning Bolt');
      expect(res.body.notFound).toEqual([]);
      expect(mockResolveCards).toHaveBeenCalledWith(['Lightning Bolt']);
    });

    it('with empty cards array returns empty resolved array', async () => {
      const res = await request(app)
        .post('/api/cards/resolve')
        .send({ cards: [] });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ resolved: [], notFound: [] });
      // Should not call scryfall at all for empty input
      expect(mockResolveCards).not.toHaveBeenCalled();
    });

    it('without cards field returns 400', async () => {
      const res = await request(app)
        .post('/api/cards/resolve')
        .send({ deck: 'something' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cards/i);
    });

    it('with invalid card entry (missing name) returns 400', async () => {
      const res = await request(app)
        .post('/api/cards/resolve')
        .send({ cards: [{ quantity: 4 }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });

    it('with null entry in cards array returns 400', async () => {
      const res = await request(app)
        .post('/api/cards/resolve')
        .send({ cards: [null] });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('with too many cards (>300) returns 400', async () => {
      const cards = Array.from({ length: 301 }, (_, i) => ({
        name: `Card ${i}`,
        quantity: 1,
      }));

      const res = await request(app)
        .post('/api/cards/resolve')
        .send({ cards });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/300/);
    });

    it('when Scryfall fails returns 502', async () => {
      mockResolveCards.mockRejectedValue(new Error('Scryfall API error: 500'));

      const res = await request(app)
        .post('/api/cards/resolve')
        .send({ cards: [{ name: 'Lightning Bolt', quantity: 4 }] });

      expect(res.status).toBe(502);
      expect(res.body.error).toMatch(/scryfall/i);
    });
  });
});
