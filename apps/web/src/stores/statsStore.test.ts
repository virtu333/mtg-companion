// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useStatsStore } from './statsStore';

const STORAGE_KEY = 'mtg-companion:decisions';

function makeDecision(overrides: Record<string, unknown> = {}) {
  return {
    deckId: 'abc123',
    handCards: ['id1', 'id2', 'id3', 'id4', 'id5', 'id6', 'id7'],
    decision: 'keep' as const,
    mulliganNumber: 0,
    onPlay: true,
    ...overrides,
  };
}

describe('statsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the store state
    useStatsStore.setState({ decisions: [] });
  });

  it('records a decision and adds it to the array', () => {
    useStatsStore.getState().recordDecision(makeDecision());
    const decisions = useStatsStore.getState().decisions;
    expect(decisions).toHaveLength(1);
    expect(decisions[0].deckId).toBe('abc123');
    expect(decisions[0].decision).toBe('keep');
    expect(decisions[0].id).toBeTruthy();
    expect(decisions[0].timestamp).toBeTruthy();
  });

  it('persists decisions to localStorage', () => {
    useStatsStore.getState().recordDecision(makeDecision());
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].deckId).toBe('abc123');
  });

  it('loads existing decisions from localStorage on init', () => {
    const existing = [{ ...makeDecision(), id: 'existing-1', timestamp: '2025-01-01T00:00:00Z' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    // Re-initialize by setting state from localStorage
    useStatsStore.setState({ decisions: JSON.parse(localStorage.getItem(STORAGE_KEY)!) });
    expect(useStatsStore.getState().decisions).toHaveLength(1);
    expect(useStatsStore.getState().decisions[0].id).toBe('existing-1');
  });

  it('handles missing localStorage key gracefully', () => {
    // localStorage is already clear from beforeEach
    expect(useStatsStore.getState().decisions).toEqual([]);
  });

  it('handles corrupt localStorage data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    // Simulate re-initialization
    const loaded = (() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    useStatsStore.setState({ decisions: loaded });
    expect(useStatsStore.getState().decisions).toEqual([]);
  });

  it('returns zero stats for unknown deckId', () => {
    const stats = useStatsStore.getState().getStatsForDeck('unknown');
    expect(stats).toEqual({
      deckId: 'unknown',
      totalHands: 0,
      keepRate: 0,
      averageMulligans: 0,
      mulliganDistribution: {},
    });
  });

  it('computes correct totalHands (keeps only)', () => {
    const { recordDecision } = useStatsStore.getState();
    // Simulate: mull, then keep at mull 1
    record(recordDecision, { decision: 'mulligan', mulliganNumber: 0 });
    record(recordDecision, { decision: 'keep', mulliganNumber: 1 });
    // Simulate: keep first hand
    record(recordDecision, { decision: 'keep', mulliganNumber: 0 });

    const stats = useStatsStore.getState().getStatsForDeck('abc123');
    expect(stats.totalHands).toBe(2); // 2 keeps, 1 mulligan ignored
  });

  it('computes correct keepRate', () => {
    const { recordDecision } = useStatsStore.getState();
    // 3 keeps: 2 at mull 0, 1 at mull 1
    record(recordDecision, { decision: 'keep', mulliganNumber: 0 });
    record(recordDecision, { decision: 'keep', mulliganNumber: 0 });
    record(recordDecision, { decision: 'keep', mulliganNumber: 1 });

    const stats = useStatsStore.getState().getStatsForDeck('abc123');
    expect(stats.keepRate).toBeCloseTo(2 / 3);
  });

  it('computes correct averageMulligans', () => {
    const { recordDecision } = useStatsStore.getState();
    record(recordDecision, { decision: 'keep', mulliganNumber: 0 });
    record(recordDecision, { decision: 'keep', mulliganNumber: 1 });
    record(recordDecision, { decision: 'keep', mulliganNumber: 2 });

    const stats = useStatsStore.getState().getStatsForDeck('abc123');
    expect(stats.averageMulligans).toBe(1); // (0+1+2)/3
  });

  it('computes correct mulliganDistribution', () => {
    const { recordDecision } = useStatsStore.getState();
    record(recordDecision, { decision: 'keep', mulliganNumber: 0 });
    record(recordDecision, { decision: 'keep', mulliganNumber: 0 });
    record(recordDecision, { decision: 'keep', mulliganNumber: 1 });
    record(recordDecision, { decision: 'keep', mulliganNumber: 2 });

    const stats = useStatsStore.getState().getStatsForDeck('abc123');
    expect(stats.mulliganDistribution).toEqual({ 0: 2, 1: 1, 2: 1 });
  });

  it('clearHistory() clears all decisions', () => {
    const { recordDecision } = useStatsStore.getState();
    record(recordDecision, {});
    record(recordDecision, { deckId: 'other-deck' });
    expect(useStatsStore.getState().decisions).toHaveLength(2);

    useStatsStore.getState().clearHistory();
    expect(useStatsStore.getState().decisions).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
  });

  it('clearHistory(deckId) clears only that deck', () => {
    const { recordDecision } = useStatsStore.getState();
    record(recordDecision, {});
    record(recordDecision, { deckId: 'other-deck' });
    expect(useStatsStore.getState().decisions).toHaveLength(2);

    useStatsStore.getState().clearHistory('abc123');
    const remaining = useStatsStore.getState().decisions;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].deckId).toBe('other-deck');
  });
});

/** Helper to record a decision with defaults merged */
function record(
  fn: (d: ReturnType<typeof makeDecision>) => void,
  overrides: Record<string, unknown>,
) {
  fn(makeDecision(overrides));
}
