import { useStatsStore } from '../../stores/statsStore';

interface StatsPanelProps {
  deckId: string;
}

export default function StatsPanel({ deckId }: StatsPanelProps) {
  // Subscribe to decisions so we re-render when they change
  const stats = useStatsStore((s) => s.getStatsForDeck(deckId));
  const clearHistory = useStatsStore((s) => s.clearHistory);

  if (stats.totalHands === 0) return null;

  const maxCount = Math.max(...Object.values(stats.mulliganDistribution));

  const handleClear = () => {
    if (window.confirm('Clear all mulligan history for this deck?')) {
      clearHistory(deckId);
    }
  };

  return (
    <div className="border-t border-gray-700 pt-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Session Stats</h2>
        <button
          className="px-3 py-1 text-xs text-gray-400 hover:text-red-400 border border-gray-600 hover:border-red-400 rounded transition-colors"
          onClick={handleClear}
        >
          Clear History
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{stats.totalHands}</div>
          <div className="text-xs text-gray-400">Total Hands</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{Math.round(stats.keepRate * 100)}%</div>
          <div className="text-xs text-gray-400">Keep Rate</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{stats.averageMulligans.toFixed(1)}</div>
          <div className="text-xs text-gray-400">Avg Mulligans</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Mulligan Distribution</h3>
        <div className="space-y-1">
          {Object.entries(stats.mulliganDistribution)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([mullNum, count]) => {
              const pct = (count / stats.totalHands) * 100;
              const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const label =
                mullNum === '0'
                  ? 'Kept opening 7'
                  : `After ${mullNum} mull${Number(mullNum) > 1 ? 's' : ''}`;
              return (
                <div key={mullNum} className="flex items-center gap-2 text-sm">
                  <span className="w-32 text-gray-400 text-xs">{label}</span>
                  <div className="flex-1 bg-gray-800 rounded h-5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs text-gray-400">
                    {count} ({Math.round(pct)}%)
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
