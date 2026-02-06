import type { ResolvedCard } from '@mtg-companion/shared-types';
import CardImage from '../common/CardImage';
import HandDisplay from './HandDisplay';

interface DrawnCard {
  turn: number;
  card: ResolvedCard;
}

interface DrawPhaseProps {
  hand: ResolvedCard[];
  drawnCards: DrawnCard[];
  librarySize: number;
  turnNumber: number;
  onDraw: () => void;
  onNewHand: () => void;
}

export default function DrawPhase({
  hand,
  drawnCards,
  librarySize,
  turnNumber,
  onDraw,
  onNewHand,
}: DrawPhaseProps) {
  return (
    <div className="space-y-6">
      {/* Opening hand */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Opening Hand</h3>
        <HandDisplay cards={hand} />
      </div>

      {/* Drawn cards */}
      {drawnCards.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Drawn Cards</h3>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {drawnCards.map((dc) => (
              <div key={`drawn-${dc.turn}`} className="space-y-1">
                <span className="text-xs text-gray-500 block text-center">Turn {dc.turn}</span>
                <CardImage card={dc.card} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          onClick={onDraw}
          disabled={librarySize === 0}
        >
          Draw (Turn {turnNumber + 1})
        </button>
        <button
          className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          onClick={onNewHand}
        >
          New Hand
        </button>
        <span className="text-sm text-gray-500">{librarySize} cards remaining</span>
      </div>
    </div>
  );
}
