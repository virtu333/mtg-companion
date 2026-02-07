import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, setCorsHeaders } from '../lib/auth';
import { getDecisions, saveDecisions } from '../lib/db';
import type { MulliganDecision } from '@mtg-companion/shared-types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const auth = await verifyAuth(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }

  if (req.method === 'GET') {
    try {
      const deckId = req.query.deckId as string | undefined;
      const decisions = await getDecisions(auth.userId, deckId);
      res.json(decisions);
    } catch (err) {
      console.error('Error fetching decisions:', err);
      res.status(500).json({ error: 'Failed to fetch decisions' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { decisions } = req.body as { decisions?: MulliganDecision[] };
      if (!decisions || !Array.isArray(decisions)) {
        res.status(400).json({ error: 'Request body must include a "decisions" array' });
        return;
      }
      if (decisions.length > 500) {
        res.status(400).json({ error: 'Too many decisions (max 500)' });
        return;
      }
      await saveDecisions(auth.userId, decisions);
      res.status(200).json({ ok: true, count: decisions.length });
    } catch (err) {
      console.error('Error saving decisions:', err);
      res.status(500).json({ error: 'Failed to save decisions' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
