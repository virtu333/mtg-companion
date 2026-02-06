interface MulliganControlsProps {
  mulliganCount: number;
  onKeep: () => void;
  onMulligan: () => void;
}

export default function MulliganControls({ mulliganCount, onKeep, onMulligan }: MulliganControlsProps) {
  // After mulling to 1, you must keep
  const canMulligan = 7 - mulliganCount > 1;
  const handSize = 7 - mulliganCount;

  return (
    <div className="flex items-center gap-4">
      <button
        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        onClick={onKeep}
      >
        Keep{mulliganCount > 0 ? ` (${handSize} cards)` : ''}
      </button>
      {canMulligan && (
        <button
          className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          onClick={onMulligan}
        >
          Mulligan
        </button>
      )}
      {mulliganCount > 0 && (
        <span className="text-sm text-gray-400">
          Mulligan #{mulliganCount} — keeping {handSize} card{handSize !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
