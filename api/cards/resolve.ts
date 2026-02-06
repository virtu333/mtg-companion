import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ScryfallClient } from '@mtg-companion/scryfall-client';
import type { ResolvedCard } from '@mtg-companion/shared-types';

const scryfall = new ScryfallClient({ cacheTtlMs: 86400 * 1000 });

interface ResolveRequestCard {
  name: string;
  quantity: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body as { cards?: ResolveRequestCard[] };

    if (!body.cards || !Array.isArray(body.cards)) {
      res.status(400).json({ error: 'Request body must include a "cards" array' });
      return;
    }

    if (body.cards.length === 0) {
      res.json({ resolved: [], notFound: [] });
      return;
    }

    if (body.cards.length > 300) {
      res.status(400).json({ error: 'Too many cards (max 300)' });
      return;
    }

    for (const entry of body.cards) {
      if (typeof entry !== 'object' || entry === null) {
        res.status(400).json({ error: 'Invalid card entry' });
        return;
      }
      if (typeof entry.name !== 'string' || !entry.name.trim()) {
        res.status(400).json({ error: 'Each card must have a non-empty "name" string' });
        return;
      }
      if (typeof entry.quantity !== 'number' || entry.quantity < 1) {
        res.status(400).json({ error: 'Each card must have a "quantity" >= 1' });
        return;
      }
    }

    const uniqueNames = [...new Set(body.cards.map((c) => c.name.trim()))];
    const result = await scryfall.resolveCards(uniqueNames);

    const resolved: ResolvedCard[] = [];
    for (const card of result.resolved.values()) {
      resolved.push(card);
    }

    res.json({ resolved, notFound: result.notFound });
  } catch (err) {
    console.error('Error resolving cards:', err);
    res.status(502).json({ error: 'Failed to resolve cards from Scryfall' });
  }
}
