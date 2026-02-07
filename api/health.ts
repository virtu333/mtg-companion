import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './lib/auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  res.json({ status: 'ok' });
}
