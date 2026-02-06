import { useState } from 'react';
import type { ResolvedCard } from '@mtg-companion/shared-types';
import HandDisplay from './HandDisplay';

interface BottomingInterfaceProps {
  hand: ResolvedCard[];
  cardsToBottom: number;
  onConfirm: (cards: ResolvedCard[]) => void;
}

export default function BottomingInterface({ hand, cardsToBottom, onConfirm }: BottomingInterfaceProps) {
  const [selected, setSelected] = useState<Set<ResolvedCard>>(new Set());

  const toggleCard = (card: ResolvedCard) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(card)) {
        next.delete(card);
      } else if (next.size < cardsToBottom) {
        next.add(card);
      }
      return next;
    });
  };

  const canConfirm = selected.size === cardsToBottom;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">
        Select <span className="font-bold text-white">{cardsToBottom}</span> card
        {cardsToBottom > 1 ? 's' : ''} to put on the bottom of your library.
        <span className="text-gray-500 ml-2">({selected.size}/{cardsToBottom} selected)</span>
      </p>

      <HandDisplay cards={hand} selectedCards={selected} onCardClick={toggleCard} />

      <button
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        onClick={() => onConfirm([...selected])}
        disabled={!canConfirm}
      >
        Confirm Bottom
      </button>
    </div>
  );
}
