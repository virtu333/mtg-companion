import type { ResolvedCard } from '@mtg-companion/shared-types';
import CardImage from '../common/CardImage';

interface HandDisplayProps {
  cards: ResolvedCard[];
  selectedCards?: Set<ResolvedCard>;
  onCardClick?: (card: ResolvedCard) => void;
}

export default function HandDisplay({ cards, selectedCards, onCardClick }: HandDisplayProps) {
  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {cards.map((card, i) => (
        <CardImage
          key={`${card.scryfallId}-${i}`}
          card={card}
          selected={selectedCards?.has(card)}
          onClick={onCardClick ? () => onCardClick(card) : undefined}
        />
      ))}
    </div>
  );
}
