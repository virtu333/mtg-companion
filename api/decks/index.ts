import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, setCorsHeaders } from '../lib/auth';
import { getSavedDecks, upsertDeck } from '../lib/db';
import type { SavedDeck } from '@mtg-companion/shared-types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const auth = await verifyAuth(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }

  if (req.method === 'GET') {
    try {
      const decks = await getSavedDecks(auth.userId);
      res.json(decks);
    } catch (err) {
      console.error('Error fetching decks:', err);
      res.status(500).json({ error: 'Failed to fetch decks' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const deck = req.body as SavedDeck;
      if (!deck.id || !deck.name || !deck.rawInput) {
        res.status(400).json({ error: 'Missing required deck fields' });
        return;
      }
      await upsertDeck(auth.userId, deck);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error saving deck:', err);
      res.status(500).json({ error: 'Failed to save deck' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
