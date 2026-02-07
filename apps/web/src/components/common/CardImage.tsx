import { useState } from 'react';
import type { ResolvedCard } from '@mtg-companion/shared-types';

interface CardImageProps {
  card: ResolvedCard;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function CardImage({ card, selected, onClick, className = '' }: CardImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const interactive = !!onClick;

  return (
    <div
      className={`relative aspect-[488/680] rounded-lg overflow-hidden transition-all ${
        interactive ? 'cursor-pointer' : ''
      } ${selected ? 'ring-2 ring-blue-400 scale-105' : ''} ${className}`}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      {/* Card image — always in layout (opacity, not display) so onLoad fires reliably */}
      <img
        src={card.imageUri}
        alt={card.name}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />

      {/* Loading skeleton overlay */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse" />
      )}

      {/* Error fallback overlay */}
      {error && (
        <div className="absolute inset-0 bg-gray-800 border border-gray-600 flex items-center justify-center p-2">
          <span className="text-xs text-gray-400 text-center leading-tight">{card.name}</span>
        </div>
      )}

      {/* Selection overlay */}
      {selected && (
        <div className="absolute inset-0 bg-blue-500/20 pointer-events-none" />
      )}
    </div>
  );
}
