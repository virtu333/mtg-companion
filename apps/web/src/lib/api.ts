import type { ResolvedCard, SavedDeck, MulliganDecision } from '@mtg-companion/shared-types';

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

// ── Auth-aware API helpers ─────────────────────────────────────────

function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── Decks ──────────────────────────────────────────────────────────

export async function fetchDecks(token: string): Promise<SavedDeck[]> {
  const res = await fetch(`${API_URL}/api/decks`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to fetch decks: ${res.status}`);
  return res.json();
}

export async function saveDeckToServer(deck: SavedDeck, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/decks`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(deck),
  });
  if (!res.ok) throw new Error(`Failed to save deck: ${res.status}`);
}

export async function deleteDeckFromServer(deckId: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/decks/${deckId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to delete deck: ${res.status}`);
}

export async function renameDeckOnServer(deckId: string, name: string, token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/decks/${deckId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to rename deck: ${res.status}`);
}

// ── Decisions ──────────────────────────────────────────────────────

export async function fetchDecisions(token: string, deckId?: string): Promise<MulliganDecision[]> {
  const url = deckId
    ? `${API_URL}/api/decisions?deckId=${encodeURIComponent(deckId)}`
    : `${API_URL}/api/decisions`;
  const res = await fetch(url, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to fetch decisions: ${res.status}`);
  return res.json();
}

export async function saveDecisionsToServer(decisions: MulliganDecision[], token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/decisions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ decisions }),
  });
  if (!res.ok) throw new Error(`Failed to save decisions: ${res.status}`);
}

export async function clearDecisionsOnServer(token: string, deckId?: string): Promise<void> {
  const url = deckId
    ? `${API_URL}/api/decisions/clear?deckId=${encodeURIComponent(deckId)}`
    : `${API_URL}/api/decisions/clear`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Failed to clear decisions: ${res.status}`);
}

// ── Migration ──────────────────────────────────────────────────────

export async function migrateLocalData(
  data: { decks: SavedDeck[]; decisions: MulliganDecision[] },
  token: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/migrate`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Migration failed: ${res.status}`);
}
