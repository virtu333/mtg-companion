import type { ParsedDeckEntry, ParseError, ParseResult } from '@mtg-companion/shared-types';

/**
 * Regex for parsing a decklist line.
 * Matches: "4 Lightning Bolt", "4x Lightning Bolt", "4 Lightning Bolt (FDN) 123"
 * Groups: [1] quantity, [2] card name
 */
const CARD_LINE_RE = /^(\d+)x?\s+(.+?)(?:\s+\([A-Z0-9]+\)\s+\d+)?$/;

/** Patterns that indicate the start of a sideboard section */
const SIDEBOARD_MARKERS = ['sideboard', 'sb:'];

function isSideboardMarker(line: string): boolean {
  const lower = line.toLowerCase().trim();
  return SIDEBOARD_MARKERS.some((m) => lower === m || lower === m.replace(':', ''));
}

function isIgnoredLine(line: string): boolean {
  const trimmed = line.trim();
  // Skip comments and common section headers like "Deck", "Companion", "Commander"
  if (trimmed.startsWith('//') || trimmed.startsWith('#')) return true;
  const lower = trimmed.toLowerCase();
  if (lower === 'deck' || lower === 'companion' || lower === 'commander') return true;
  // Skip MTGGoldfish Arena export metadata lines ("About", "Name <deck name>")
  if (lower === 'about' || lower.startsWith('name ')) return true;
  return false;
}

/**
 * Parse a raw decklist string into structured mainboard/sideboard entries.
 *
 * Supports MTGO, MTG Arena, and plain "N CardName" formats.
 * Sideboard is detected by a blank line separator, "Sideboard" header, or "SB:" prefix.
 */
export function parseDecklist(input: string): ParseResult {
  const lines = input.split(/\r?\n/);
  const mainboard: ParsedDeckEntry[] = [];
  const sideboard: ParsedDeckEntry[] = [];
  const errors: ParseError[] = [];

  let inSideboard = false;
  let sawCards = false; // track if we've seen any card lines yet

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Empty line after cards signals sideboard transition
    if (trimmed === '') {
      if (sawCards && !inSideboard) {
        inSideboard = true;
      }
      continue;
    }

    // Skip comments and section headers
    if (isIgnoredLine(trimmed)) continue;

    // Explicit sideboard marker
    if (isSideboardMarker(trimmed)) {
      inSideboard = true;
      continue;
    }

    // Handle "SB: 2 CardName" inline prefix
    let lineToParse = trimmed;
    let forceSideboard = false;
    if (/^sb:\s*/i.test(lineToParse)) {
      lineToParse = lineToParse.replace(/^sb:\s*/i, '');
      forceSideboard = true;
    }

    const match = CARD_LINE_RE.exec(lineToParse);
    if (!match) {
      errors.push({
        line: i + 1,
        text: raw,
        reason: 'Could not parse card entry',
      });
      continue;
    }

    const quantity = parseInt(match[1], 10);
    const name = match[2].trim();

    if (quantity <= 0) {
      errors.push({
        line: i + 1,
        text: raw,
        reason: 'Quantity must be at least 1',
      });
      continue;
    }

    const entry: ParsedDeckEntry = { name, quantity };
    const target = inSideboard || forceSideboard ? sideboard : mainboard;
    target.push(entry);
    sawCards = true;
  }

  return { mainboard, sideboard, errors };
}

export type { ParsedDeckEntry, ParseError, ParseResult };
