import type { CardInstance } from '@mtg-companion/shared-types';
import CardImage from '../common/CardImage';

interface HandDisplayProps {
  cards: CardInstance[];
  selectedIds?: Set<number>;
  onCardClick?: (instance: CardInstance) => void;
}

export default function HandDisplay({ cards, selectedIds, onCardClick }: HandDisplayProps) {
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {cards.map((instance) => (
        <CardImage
          key={instance.instanceId}
          card={instance.card}
          selected={selectedIds?.has(instance.instanceId)}
          onClick={onCardClick ? () => onCardClick(instance) : undefined}
        />
      ))}
    </div>
  );
}
