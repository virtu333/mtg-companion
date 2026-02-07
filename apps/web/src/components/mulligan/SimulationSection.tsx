import { useCallback, useMemo } from 'react';
import type { ResolvedCard } from '@mtg-companion/shared-types';
import type { ParseResult } from '@mtg-companion/shared-types';
import { useSimulationStore } from '../../stores/simulationStore';
import { useStatsStore } from '../../stores/statsStore';
import HandDisplay from './HandDisplay';
import MulliganControls from './MulliganControls';
import BottomingInterface from './BottomingInterface';
import DrawPhase from './DrawPhase';

interface SimulationSectionProps {
  resolvedCards: ResolvedCard[];
  parseResult: ParseResult;
  deckId: string;
  aliases: Record<string, string>;
}

/** Build a full deck array by expanding quantities, looking up resolved card data */
function buildDeckArray(
  parseResult: ParseResult,
  resolvedCards: ResolvedCard[],
  aliases: Record<string, string>,
): ResolvedCard[] {
  const cardMap = new Map<string, ResolvedCard>();
  for (const card of resolvedCards) {
    cardMap.set(card.name.toLowerCase(), card);
    // Also index by front face name for DFCs (e.g. "Bloodsoaked Insight" for "Bloodsoaked Insight // Sanguine Morass")
    if (card.name.includes(' // ')) {
      const frontFace = card.name.split(' // ')[0];
      cardMap.set(frontFace.toLowerCase(), card);
    }
  }

  const deck: ResolvedCard[] = [];
  // Only use mainboard for simulation
  for (const entry of parseResult.mainboard) {
    // Try direct name match, then check aliases (e.g. Arena name → Scryfall name)
    let card = cardMap.get(entry.name.toLowerCase());
    if (!card) {
      const aliasedName = aliases[entry.name];
      if (aliasedName) card = cardMap.get(aliasedName.toLowerCase());
    }
    if (card) {
      for (let i = 0; i < entry.quantity; i++) {
        deck.push(card);
      }
    }
  }
  return deck;
}

export default function SimulationSection({ resolvedCards, parseResult, deckId, aliases }: SimulationSectionProps) {
  const phase = useSimulationStore((s) => s.phase);
  const hand = useSimulationStore((s) => s.hand);
  const library = useSimulationStore((s) => s.library);
  const mulliganCount = useSimulationStore((s) => s.mulliganCount);
  const drawnCards = useSimulationStore((s) => s.drawnCards);
  const turnNumber = useSimulationStore((s) => s.turnNumber);
  const startNewHand = useSimulationStore((s) => s.startNewHand);
  const mulligan = useSimulationStore((s) => s.mulligan);
  const keep = useSimulationStore((s) => s.keep);
  const bottomCards = useSimulationStore((s) => s.bottomCards);
  const drawCard = useSimulationStore((s) => s.drawCard);
  const recordDecision = useStatsStore((s) => s.recordDecision);

  const deckCards = useMemo(
    () => buildDeckArray(parseResult, resolvedCards, aliases),
    [parseResult, resolvedCards, aliases],
  );

  const handleStart = useCallback(() => startNewHand(deckCards), [deckCards, startNewHand]);

  const handleMulligan = useCallback(() => {
    recordDecision({
      deckId,
      handCards: hand.map((c) => c.card.scryfallId),
      decision: 'mulligan',
      mulliganNumber: mulliganCount,
      onPlay: true,
    });
    mulligan();
  }, [hand, mulliganCount, deckId, mulligan, recordDecision]);

  const handleKeep = useCallback(() => {
    if (mulliganCount === 0) {
      recordDecision({
        deckId,
        handCards: hand.map((c) => c.card.scryfallId),
        decision: 'keep',
        mulliganNumber: 0,
        onPlay: true,
      });
    }
    // If mulliganCount > 0, recording is deferred to handleBottomCards
    keep();
  }, [hand, mulliganCount, deckId, keep, recordDecision]);

  const handleBottomCards = useCallback(
    (instanceIds: Set<number>) => {
      const bottomedScryfallIds = hand
        .filter((c) => instanceIds.has(c.instanceId))
        .map((c) => c.card.scryfallId);
      recordDecision({
        deckId,
        handCards: hand.map((c) => c.card.scryfallId),
        decision: 'keep',
        mulliganNumber: mulliganCount,
        bottomedCards: bottomedScryfallIds,
        onPlay: true,
      });
      bottomCards(instanceIds);
    },
    [hand, mulliganCount, deckId, bottomCards, recordDecision],
  );

  const deckSize = deckCards.length;

  if (phase === 'idle') {
    return (
      <div className="border-t border-gray-700 pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Simulation</h2>
          <span className="text-sm text-gray-400">{deckSize} cards in mainboard</span>
        </div>
        <button
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          onClick={handleStart}
        >
          Draw Opening Hand
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-700 pt-6 mt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Simulation</h2>
        <span className="text-sm text-gray-400">{deckSize} cards in mainboard</span>
      </div>

      {/* Deciding phase: show hand + keep/mulligan buttons */}
      {phase === 'deciding' && (
        <div className="space-y-4">
          <HandDisplay cards={hand} />
          <MulliganControls
            mulliganCount={mulliganCount}
            onKeep={handleKeep}
            onMulligan={handleMulligan}
          />
        </div>
      )}

      {/* Bottoming phase: select cards to put on bottom */}
      {phase === 'bottoming' && (
        <BottomingInterface
          hand={hand}
          cardsToBottom={mulliganCount}
          onConfirm={handleBottomCards}
        />
      )}

      {/* Playing phase: draw cards, see hand */}
      {phase === 'playing' && (
        <DrawPhase
          hand={hand}
          drawnCards={drawnCards}
          librarySize={library.length}
          turnNumber={turnNumber}
          onDraw={drawCard}
          onNewHand={handleStart}
        />
      )}
    </div>
  );
}
