import DeckInput from '../components/mulligan/DeckInput';
import SimulationSection from '../components/mulligan/SimulationSection';
import { useDeckStore } from '../stores/deckStore';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function MulliganPage() {
  useDocumentTitle('Mulligan Simulator');
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
