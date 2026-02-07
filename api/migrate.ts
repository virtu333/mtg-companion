import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, setCorsHeaders } from './lib/auth';
import { upsertDeck, saveDecisions } from './lib/db';
import type { SavedDeck, MulliganDecision } from '@mtg-companion/shared-types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await verifyAuth(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const { decks, decisions } = req.body as {
      decks?: SavedDeck[];
      decisions?: MulliganDecision[];
    };

    let deckCount = 0;
    let decisionCount = 0;

    if (decks && Array.isArray(decks)) {
      for (const deck of decks) {
        await upsertDeck(auth.userId, deck);
        deckCount++;
      }
    }

    if (decisions && Array.isArray(decisions)) {
      // saveDecisions uses ON CONFLICT DO NOTHING — safe for idempotent migration
      await saveDecisions(auth.userId, decisions);
      decisionCount = decisions.length;
    }

    res.status(200).json({ ok: true, migrated: { decks: deckCount, decisions: decisionCount } });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: 'Migration failed' });
  }
}
