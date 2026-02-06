import { useState } from 'react';
import type { CardInstance } from '@mtg-companion/shared-types';
import HandDisplay from './HandDisplay';

interface BottomingInterfaceProps {
  hand: CardInstance[];
  cardsToBottom: number;
  onConfirm: (instanceIds: Set<number>) => void;
}

export default function BottomingInterface({ hand, cardsToBottom, onConfirm }: BottomingInterfaceProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleCard = (instance: CardInstance) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(instance.instanceId)) {
        next.delete(instance.instanceId);
      } else if (next.size < cardsToBottom) {
        next.add(instance.instanceId);
      }
      return next;
    });
  };

  const canConfirm = selectedIds.size === cardsToBottom;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-300">
        Select <span className="font-bold text-white">{cardsToBottom}</span> card
        {cardsToBottom > 1 ? 's' : ''} to put on the bottom of your library.
        <span className="text-gray-500 ml-2">({selectedIds.size}/{cardsToBottom} selected)</span>
      </p>

      <HandDisplay cards={hand} selectedIds={selectedIds} onCardClick={toggleCard} />

      <button
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        onClick={() => onConfirm(selectedIds)}
        disabled={!canConfirm}
      >
        Confirm Bottom
      </button>
    </div>
  );
}
