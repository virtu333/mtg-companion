import type { VercelRequest } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { upsertUser } from './db';

interface AuthResult {
  userId: string;
}

/**
 * Verify the Authorization header (Bearer token from Clerk).
 * Returns { userId } on success, null if unauthenticated.
 * Also upserts the user row (lazy creation).
 */
export async function verifyAuth(req: VercelRequest): Promise<AuthResult | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const userId = payload.sub;
    if (!userId) return null;

    // Lazy user creation — upsert on every auth'd request
    await upsertUser(userId);

    return { userId };
  } catch {
    return null;
  }
}

/** Standard CORS headers for all API endpoints */
export function setCorsHeaders(res: { setHeader: (k: string, v: string) => void }) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
