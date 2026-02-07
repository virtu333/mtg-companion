import { describe, it, expect, beforeEach } from 'vitest';
import type { ResolvedCard } from '@mtg-companion/shared-types';
import { useSimulationStore } from './simulationStore';

/** Minimal card factory for tests */
function makeCard(name: string): ResolvedCard {
  return {
    scryfallId: `id-${name}`,
    name,
    manaCost: '{1}',
    typeLine: 'Creature',
    oracleText: '',
    colors: [],
    imageUri: '',
    cmc: 1,
  };
}

/** Generate a 60-card deck for testing */
function makeDeck(): ResolvedCard[] {
  const cards: ResolvedCard[] = [];
  for (let i = 0; i < 60; i++) {
    cards.push(makeCard(`Card ${i}`));
  }
  return cards;
}

describe('simulationStore', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
  });

  it('startNewHand draws 7 and sets phase to deciding', () => {
    useSimulationStore.getState().startNewHand(makeDeck());
    const { phase, hand, library } = useSimulationStore.getState();
    expect(phase).toBe('deciding');
    expect(hand).toHaveLength(7);
    expect(library).toHaveLength(53);
  });

  it('keep on play (no mulligans) → playing, no auto-draw', () => {
    useSimulationStore.getState().startNewHand(makeDeck());
    useSimulationStore.getState().keep();
    const { phase, turnNumber, drawnCards } = useSimulationStore.getState();
    expect(phase).toBe('playing');
    expect(turnNumber).toBe(1);
    expect(drawnCards).toHaveLength(0);
  });

  it('keep on draw (no mulligans) → playing, auto-draws turn 1 card', () => {
    useSimulationStore.getState().setOnPlay(false);
    useSimulationStore.getState().startNewHand(makeDeck());
    const libBefore = useSimulationStore.getState().library.length;
    useSimulationStore.getState().keep();
    const { phase, turnNumber, drawnCards, library } = useSimulationStore.getState();
    expect(phase).toBe('playing');
    expect(turnNumber).toBe(1);
    expect(drawnCards).toHaveLength(1);
    expect(drawnCards[0].turn).toBe(1);
    expect(library).toHaveLength(libBefore - 1);
  });

  it('bottomCards on play → playing, no auto-draw', () => {
    useSimulationStore.getState().startNewHand(makeDeck());
    useSimulationStore.getState().mulligan();
    useSimulationStore.getState().keep(); // phase → bottoming
    const { hand } = useSimulationStore.getState();
    const toBottom = new Set([hand[0].instanceId]);
    useSimulationStore.getState().bottomCards(toBottom);
    const { phase, drawnCards, hand: finalHand } = useSimulationStore.getState();
    expect(phase).toBe('playing');
    expect(drawnCards).toHaveLength(0);
    expect(finalHand).toHaveLength(6);
  });

  it('bottomCards on draw → playing, auto-draws turn 1 card', () => {
    useSimulationStore.getState().setOnPlay(false);
    useSimulationStore.getState().startNewHand(makeDeck());
    useSimulationStore.getState().mulligan();
    useSimulationStore.getState().keep(); // phase → bottoming
    const { hand } = useSimulationStore.getState();
    const toBottom = new Set([hand[0].instanceId]);
    useSimulationStore.getState().bottomCards(toBottom);
    const { phase, drawnCards, hand: finalHand } = useSimulationStore.getState();
    expect(phase).toBe('playing');
    expect(drawnCards).toHaveLength(1);
    expect(drawnCards[0].turn).toBe(1);
    expect(finalHand).toHaveLength(6);
  });

  it('setOnPlay toggles the value', () => {
    expect(useSimulationStore.getState().onPlay).toBe(true);
    useSimulationStore.getState().setOnPlay(false);
    expect(useSimulationStore.getState().onPlay).toBe(false);
    useSimulationStore.getState().setOnPlay(true);
    expect(useSimulationStore.getState().onPlay).toBe(true);
  });

  it('onPlay persists across startNewHand calls', () => {
    useSimulationStore.getState().setOnPlay(false);
    useSimulationStore.getState().startNewHand(makeDeck());
    expect(useSimulationStore.getState().onPlay).toBe(false);
    useSimulationStore.getState().startNewHand(makeDeck());
    expect(useSimulationStore.getState().onPlay).toBe(false);
  });

  it('reset restores onPlay to true', () => {
    useSimulationStore.getState().setOnPlay(false);
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().onPlay).toBe(true);
  });
});
