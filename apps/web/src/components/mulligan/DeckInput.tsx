import { useDeckStore } from '../../stores/deckStore';

const PLACEHOLDER = `Paste your decklist here...

Example:
4 Lightning Bolt
4 Monastery Swiftspear
4 Goblin Guide
20 Mountain

Sideboard
4 Kor Firewalker`;

export default function DeckInput() {
  const rawInput = useDeckStore((s) => s.rawInput);
  const setRawInput = useDeckStore((s) => s.setRawInput);
  const parseResult = useDeckStore((s) => s.parseResult);
  const resolvedCards = useDeckStore((s) => s.resolvedCards);
  const notFound = useDeckStore((s) => s.notFound);
  const resolveStatus = useDeckStore((s) => s.resolveStatus);
  const resolveError = useDeckStore((s) => s.resolveError);
  const resolve = useDeckStore((s) => s.resolve);
  const clear = useDeckStore((s) => s.clear);

  const hasInput = rawInput.trim().length > 0;
  const isLoading = resolveStatus === 'loading';
  const isDone = resolveStatus === 'done';

  return (
    <div className="space-y-4">
      {/* Textarea */}
      <textarea
        className="w-full h-64 bg-gray-800 border border-gray-600 rounded-lg p-4 text-sm font-mono text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
        aria-label="Decklist input"
        placeholder={PLACEHOLDER}
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        disabled={isLoading || isDone}
        spellCheck={false}
      />

      {/* Actions */}
      <div className="flex gap-3">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          onClick={resolve}
          disabled={!hasInput || isLoading || isDone}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Resolving…
            </span>
          ) : (
            'Load Deck'
          )}
        </button>
        {(hasInput || isDone) && (
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
            onClick={clear}
            disabled={isLoading}
          >
            Clear
          </button>
        )}
      </div>

      {/* Parse errors */}
      {parseResult && parseResult.errors.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-400 text-sm font-medium mb-2">
            {parseResult.errors.length} line{parseResult.errors.length > 1 ? 's' : ''} couldn't be
            parsed:
          </p>
          <ul className="text-sm text-yellow-300/80 space-y-1 font-mono">
            {parseResult.errors.map((err) => (
              <li key={err.line}>
                Line {err.line}: {err.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resolve error */}
      {resolveError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-400 text-sm">{resolveError}</p>
        </div>
      )}

      {/* Success summary */}
      {isDone && resolvedCards.length > 0 && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <p className="text-green-400 text-sm font-medium">
            Resolved {resolvedCards.length} unique card{resolvedCards.length > 1 ? 's' : ''}
            {parseResult && (
              <span className="text-green-400/70">
                {' '}
                ({parseResult.mainboard.reduce((s, e) => s + e.quantity, 0)} mainboard
                {parseResult.sideboard.length > 0 &&
                  `, ${parseResult.sideboard.reduce((s, e) => s + e.quantity, 0)} sideboard`}
                )
              </span>
            )}
          </p>
        </div>
      )}

      {/* Not found cards */}
      {isDone && notFound.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-400 text-sm font-medium mb-2">
            {notFound.length} card{notFound.length > 1 ? 's' : ''} not found on Scryfall:
          </p>
          <ul className="text-sm text-yellow-300/80 space-y-1">
            {notFound.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
