import type { MtgColor, ResolvedCard } from '@mtg-companion/shared-types';

// ── Types ──────────────────────────────────────────────────────────

/** Raw Scryfall card object (subset of fields we care about) */
interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  cmc: number;
  image_uris?: { normal: string };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    colors?: string[];
    image_uris?: { normal: string };
  }>;
}

interface ScryfallCollectionResponse {
  data: ScryfallCard[];
  not_found: Array<{ name: string }>;
}

export interface ResolveResult {
  resolved: Map<string, ResolvedCard>;
  notFound: string[];
}

export interface ScryfallClientOptions {
  /** Base URL for Scryfall API (default: https://api.scryfall.com) */
  baseUrl?: string;
  /** Cache TTL in milliseconds (default: 86400000 = 24h) */
  cacheTtlMs?: number;
  /** Custom fetch function for testing */
  fetchFn?: typeof fetch;
}

// ── Cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  card: ResolvedCard;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCRYFALL_BATCH_LIMIT = 75;
const SCRYFALL_BASE_URL = 'https://api.scryfall.com';

// ── Card Mapping ───────────────────────────────────────────────────

function mapScryfallCard(sc: ScryfallCard): ResolvedCard {
  const isDFC = sc.card_faces && sc.card_faces.length >= 2;

  // For DFCs, prefer card_faces[0] for most fields
  const front = isDFC ? sc.card_faces![0] : null;

  // Image URI: DFCs may not have top-level image_uris
  let imageUri = sc.image_uris?.normal ?? '';
  let backImageUri: string | undefined;
  if (isDFC) {
    imageUri = front?.image_uris?.normal ?? sc.image_uris?.normal ?? '';
    backImageUri = sc.card_faces![1]?.image_uris?.normal;
  }

  return {
    scryfallId: sc.id,
    name: sc.name,
    manaCost: front?.mana_cost ?? sc.mana_cost ?? '',
    typeLine: front?.type_line ?? sc.type_line,
    oracleText: front?.oracle_text ?? sc.oracle_text ?? '',
    power: front?.power ?? sc.power,
    toughness: front?.toughness ?? sc.toughness,
    colors: (front?.colors ?? sc.colors ?? []) as MtgColor[],
    imageUri,
    backImageUri,
    cmc: sc.cmc,
  };
}

// ── Client ─────────────────────────────────────────────────────────

export class ScryfallClient {
  private cache = new Map<string, CacheEntry>();
  private baseUrl: string;
  private cacheTtlMs: number;
  private fetchFn: typeof fetch;

  constructor(options: ScryfallClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? SCRYFALL_BASE_URL;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_TTL_MS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  /**
   * Resolve an array of card names to full ResolvedCard data.
   * Uses Scryfall's /cards/collection batch endpoint (75 per request).
   * Results are cached in memory with a configurable TTL.
   */
  async resolveCards(names: string[]): Promise<ResolveResult> {
    const uniqueNames = [...new Set(names)];
    const resolved = new Map<string, ResolvedCard>();
    const toFetch: string[] = [];
    const now = Date.now();

    // Check cache first (lazy eviction of expired entries)
    for (const name of uniqueNames) {
      const key = name.toLowerCase();
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > now) {
        resolved.set(name, cached.card);
      } else {
        if (cached) {
          this.cache.delete(key);
        }
        toFetch.push(name);
      }
    }

    if (toFetch.length === 0) {
      return { resolved, notFound: [] };
    }

    // Split into batches of 75
    const batches: string[][] = [];
    for (let i = 0; i < toFetch.length; i += SCRYFALL_BATCH_LIMIT) {
      batches.push(toFetch.slice(i, i + SCRYFALL_BATCH_LIMIT));
    }

    const allNotFound: string[] = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const identifiers = batch.map((name) => ({ name }));

      const response = await this.fetchWithRetry(
        `${this.baseUrl}/cards/collection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MTGCompanion/0.1',
          },
          body: JSON.stringify({ identifiers }),
        },
      );

      const data: ScryfallCollectionResponse = await response.json();

      // Map and cache resolved cards
      for (const sc of data.data) {
        const card = mapScryfallCard(sc);
        resolved.set(card.name, card);
        this.cache.set(card.name.toLowerCase(), {
          card,
          expiresAt: now + this.cacheTtlMs,
        });
      }

      // Track not-found
      for (const nf of data.not_found) {
        allNotFound.push(nf.name);
      }

      // Inter-batch delay to respect rate limits (skip after last batch)
      if (batchIdx < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return { resolved, notFound: allNotFound };
  }

  /**
   * Fetch with retry logic for 429 (Too Many Requests) responses.
   * Retries up to 3 times with exponential backoff. Uses Retry-After
   * header if present, otherwise falls back to 1s, 2s, 4s delays.
   * Non-429 errors throw immediately.
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
  ): Promise<Response> {
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 1000;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await this.fetchFn(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status !== 429 || attempt === MAX_RETRIES) {
        throw new Error(
          `Scryfall API error: ${response.status} ${response.statusText}`,
        );
      }

      // 429: wait and retry
      const retryAfter = response.headers?.get?.('Retry-After');
      const delayMs = retryAfter
        ? parseFloat(retryAfter) * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Unreachable, but TypeScript needs it
    throw new Error('Scryfall API error: max retries exceeded');
  }

  /** Clear the in-memory cache */
  clearCache(): void {
    this.cache.clear();
  }
}

export { mapScryfallCard as _mapScryfallCard };
export type { ScryfallCard as _ScryfallCard };
