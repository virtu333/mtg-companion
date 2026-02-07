import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, setCorsHeaders } from '../lib/auth';
import { deleteDecisions } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const auth = await verifyAuth(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }

  if (req.method === 'DELETE') {
    try {
      const deckId = req.query.deckId as string | undefined;
      await deleteDecisions(auth.userId, deckId);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error clearing decisions:', err);
      res.status(500).json({ error: 'Failed to clear decisions' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
