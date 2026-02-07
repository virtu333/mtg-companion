import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth, setCorsHeaders } from '../lib/auth';
import { deleteDeck, renameDeck } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const auth = await verifyAuth(req);
  if (!auth) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const deckId = req.query.id as string;
  if (!deckId) { res.status(400).json({ error: 'Missing deck id' }); return; }

  if (req.method === 'DELETE') {
    try {
      await deleteDeck(auth.userId, deckId);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error deleting deck:', err);
      res.status(500).json({ error: 'Failed to delete deck' });
    }
    return;
  }

  if (req.method === 'PATCH') {
    try {
      const { name } = req.body as { name?: string };
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Missing or invalid name' });
        return;
      }
      await renameDeck(auth.userId, deckId, name);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error renaming deck:', err);
      res.status(500).json({ error: 'Failed to rename deck' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
