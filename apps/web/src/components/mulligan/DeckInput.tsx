import { useState } from 'react';
import { useDeckStore } from '../../stores/deckStore';
import { useDeckLibraryStore } from '../../stores/deckLibraryStore';

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
  const aliases = useDeckStore((s) => s.aliases);
  const resolveStatus = useDeckStore((s) => s.resolveStatus);
  const resolveError = useDeckStore((s) => s.resolveError);
  const deckId = useDeckStore((s) => s.deckId);
  const resolve = useDeckStore((s) => s.resolve);
  const clear = useDeckStore((s) => s.clear);
  const loadSavedDeck = useDeckStore((s) => s.loadSavedDeck);

  const savedDecks = useDeckLibraryStore((s) => s.decks);
  const saveDeck = useDeckLibraryStore((s) => s.saveDeck);
  const deleteDeck = useDeckLibraryStore((s) => s.deleteDeck);
  const updateLastUsed = useDeckLibraryStore((s) => s.updateLastUsed);

  const [saveName, setSaveName] = useState('My Deck');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const hasInput = rawInput.trim().length > 0;
  const isLoading = resolveStatus === 'loading';
  const isDone = resolveStatus === 'done';

  // Sort saved decks by lastUsedAt descending
  const sortedDecks = [...savedDecks].sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );

  const handleLoadSaved = (id: string) => {
    const deck = savedDecks.find((d) => d.id === id);
    if (!deck) return;
    loadSavedDeck(deck);
    updateLastUsed(id);
    setSaveName(deck.name);
  };

  const handleSave = () => {
    if (!deckId || !parseResult || !saveName.trim()) return;
    saveDeck(saveName.trim(), {
      id: deckId,
      rawInput,
      parseResult,
      resolvedCards,
      aliases,
      notFound,
    });
    setShowSaveInput(false);
  };

  // Check if current deck is already saved (for pre-populating name)
  const existingSaved = deckId ? savedDecks.find((d) => d.id === deckId) : null;

  return (
    <div className="space-y-4">
      {/* Saved Decks List */}
      {sortedDecks.length > 0 && !isDone && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Saved Decks</h3>
          <div className="space-y-2">
            {sortedDecks.map((deck) => {
              const mainboardCount = deck.parseResult.mainboard.reduce(
                (s, e) => s + e.quantity,
                0,
              );
              const savedDate = new Date(deck.savedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              return (
                <div
                  key={deck.id}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-100 truncate">{deck.name}</span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      ({mainboardCount} cards) &middot; saved {savedDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                      onClick={() => handleLoadSaved(deck.id)}
                    >
                      Load
                    </button>
                    <button
                      className="px-2 py-1 text-gray-500 hover:text-red-400 text-xs transition-colors"
                      onClick={() => deleteDeck(deck.id)}
                      title="Delete saved deck"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
      <div className="flex items-center gap-3 flex-wrap">
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
        {/* Save button (shown when deck is resolved) */}
        {isDone && resolvedCards.length > 0 && !showSaveInput && (
          <button
            className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
            onClick={() => {
              if (existingSaved) setSaveName(existingSaved.name);
              setShowSaveInput(true);
            }}
          >
            {existingSaved ? 'Update Saved Deck' : 'Save Deck'}
          </button>
        )}
      </div>

      {/* Save form (inline) */}
      {showSaveInput && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Deck name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setShowSaveInput(false);
            }}
            autoFocus
          />
          <button
            className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            onClick={handleSave}
            disabled={!saveName.trim()}
          >
            Save
          </button>
          <button
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
            onClick={() => setShowSaveInput(false)}
          >
            Cancel
          </button>
        </div>
      )}

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
