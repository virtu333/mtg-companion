import type { ResolvedCard } from '@mtg-companion/shared-types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export interface ResolveResponse {
  resolved: ResolvedCard[];
  notFound: string[];
  /** Maps input names to resolved Scryfall names when they differ (e.g. Arena name variants) */
  aliases?: Record<string, string>;
}

export async function resolveCards(
  cards: { name: string; quantity: number }[],
  signal?: AbortSignal,
): Promise<ResolveResponse> {
  const res = await fetch(`${API_URL}/api/cards/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards }),
    signal: signal ?? AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error: ${res.status}`);
  }

  return res.json();
}
