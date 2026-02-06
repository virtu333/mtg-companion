import DeckInput from '../components/mulligan/DeckInput';
import SimulationSection from '../components/mulligan/SimulationSection';
import StatsPanel from '../components/mulligan/StatsPanel';
import { useDeckStore } from '../stores/deckStore';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function MulliganPage() {
  useDocumentTitle('Mulligan Simulator');
  const resolveStatus = useDeckStore((s) => s.resolveStatus);
  const resolvedCards = useDeckStore((s) => s.resolvedCards);
  const parseResult = useDeckStore((s) => s.parseResult);
  const deckId = useDeckStore((s) => s.deckId);
  const isDeckReady = resolveStatus === 'done' && resolvedCards.length > 0 && parseResult && deckId;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Mulligan Simulator</h1>
      <p className="text-sm text-gray-400 mb-6">
        Paste a decklist below to practice opening hand decisions.
      </p>
      <DeckInput />
      {isDeckReady && (
        <>
          <SimulationSection resolvedCards={resolvedCards} parseResult={parseResult} deckId={deckId} />
          <StatsPanel deckId={deckId} />
        </>
      )}
    </div>
  );
}
