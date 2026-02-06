import type { ResolvedCard } from '@mtg-companion/shared-types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export interface ResolveResponse {
  resolved: ResolvedCard[];
  notFound: string[];
}

export async function resolveCards(
  cards: { name: string; quantity: number }[],
): Promise<ResolveResponse> {
  const res = await fetch(`${API_URL}/api/cards/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  return res.json();
}
