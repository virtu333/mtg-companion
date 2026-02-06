import { useCallback, useMemo } from 'react';
import type { ResolvedCard } from '@mtg-companion/shared-types';
import type { ParseResult } from '@mtg-companion/shared-types';
import { useSimulationStore } from '../../stores/simulationStore';
import HandDisplay from './HandDisplay';
import MulliganControls from './MulliganControls';
import BottomingInterface from './BottomingInterface';
import DrawPhase from './DrawPhase';

interface SimulationSectionProps {
  resolvedCards: ResolvedCard[];
  parseResult: ParseResult;
}

/** Build a full deck array by expanding quantities, looking up resolved card data */
function buildDeckArray(parseResult: ParseResult, resolvedCards: ResolvedCard[]): ResolvedCard[] {
  const cardMap = new Map<string, ResolvedCard>();
  for (const card of resolvedCards) {
    cardMap.set(card.name.toLowerCase(), card);
  }

  const deck: ResolvedCard[] = [];
  // Only use mainboard for simulation
  for (const entry of parseResult.mainboard) {
    const card = cardMap.get(entry.name.toLowerCase());
    if (card) {
      for (let i = 0; i < entry.quantity; i++) {
        deck.push(card);
      }
    }
  }
  return deck;
}

export default function SimulationSection({ resolvedCards, parseResult }: SimulationSectionProps) {
  const {
    phase,
    hand,
    library,
    mulliganCount,
    drawnCards,
    turnNumber,
    startNewHand,
    mulligan,
    keep,
    bottomCards,
    drawCard,
  } = useSimulationStore();

  const deckCards = useMemo(
    () => buildDeckArray(parseResult, resolvedCards),
    [parseResult, resolvedCards],
  );

  const handleStart = useCallback(() => startNewHand(deckCards), [deckCards, startNewHand]);

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
            onKeep={keep}
            onMulligan={mulligan}
          />
        </div>
      )}

      {/* Bottoming phase: select cards to put on bottom */}
      {phase === 'bottoming' && (
        <BottomingInterface
          hand={hand}
          cardsToBottom={mulliganCount}
          onConfirm={bottomCards}
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
