import DeckInput from '../components/mulligan/DeckInput';
import SimulationSection from '../components/mulligan/SimulationSection';
import { useDeckStore } from '../stores/deckStore';

export default function MulliganPage() {
  const { resolveStatus, resolvedCards, parseResult } = useDeckStore();
  const isDeckReady = resolveStatus === 'done' && resolvedCards.length > 0 && parseResult;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mulligan Simulator</h1>
      <DeckInput />
      {isDeckReady && (
        <SimulationSection resolvedCards={resolvedCards} parseResult={parseResult} />
      )}
    </div>
  );
}
