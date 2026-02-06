import DeckInput from '../components/mulligan/DeckInput';

export default function MulliganPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mulligan Simulator</h1>
      <DeckInput />
    </div>
  );
}
