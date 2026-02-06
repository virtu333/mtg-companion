import { Router, type Router as RouterType } from 'express';
import { ScryfallClient } from '@mtg-companion/scryfall-client';
import type { ResolvedCard } from '@mtg-companion/shared-types';

const router: RouterType = Router();

// Single shared client instance — keeps the in-memory cache alive
const scryfall = new ScryfallClient({
  cacheTtlMs: Number(process.env.SCRYFALL_CACHE_TTL ?? 86400) * 1000,
});

interface ResolveRequestCard {
  name: string;
  quantity: number;
}

interface ResolveRequestBody {
  cards: ResolveRequestCard[];
}

/**
 * POST /api/cards/resolve
 * Accepts { cards: [{ name, quantity }] }
 * Returns { resolved: ResolvedCard[], notFound: string[] }
 */
router.post('/resolve', async (req, res) => {
  try {
    const body = req.body as ResolveRequestBody;

    if (!body.cards || !Array.isArray(body.cards)) {
      res.status(400).json({ error: 'Request body must include a "cards" array' });
      return;
    }

    if (body.cards.length === 0) {
      res.json({ resolved: [], notFound: [] });
      return;
    }

    // Validate entries
    for (const entry of body.cards) {
      if (typeof entry.name !== 'string' || !entry.name.trim()) {
        res.status(400).json({ error: 'Each card must have a non-empty "name" string' });
        return;
      }
      if (typeof entry.quantity !== 'number' || entry.quantity < 1) {
        res.status(400).json({ error: 'Each card must have a "quantity" >= 1' });
        return;
      }
    }

    // Deduplicate names for the Scryfall lookup
    const uniqueNames = [...new Set(body.cards.map((c) => c.name.trim()))];
    const result = await scryfall.resolveCards(uniqueNames);

    // Convert Map to array for JSON response
    const resolved: ResolvedCard[] = [];
    for (const card of result.resolved.values()) {
      resolved.push(card);
    }

    res.json({ resolved, notFound: result.notFound });
  } catch (err) {
    console.error('Error resolving cards:', err);
    res.status(502).json({ error: 'Failed to resolve cards from Scryfall' });
  }
});

export default router;
