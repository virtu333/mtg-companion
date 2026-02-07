import { useState, useMemo } from 'react';
import { useAuthContext } from '../../lib/clerkHelpers';
import { migrateLocalData } from '../../lib/api';

const MIGRATED_KEY = 'mtg-companion:migrated';
const DECKS_KEY = 'mtg-companion:saved-decks';
const DECISIONS_KEY = 'mtg-companion:decisions';

export default function MigrationBanner() {
  const { isSignedIn, getToken } = useAuthContext();
  const [dismissed, setDismissed] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocalData = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const alreadyMigrated = localStorage.getItem(MIGRATED_KEY);
      if (alreadyMigrated) return false;
      const decks = localStorage.getItem(DECKS_KEY);
      const decisions = localStorage.getItem(DECISIONS_KEY);
      const hasDecks = decks && JSON.parse(decks).length > 0;
      const hasDecisions = decisions && JSON.parse(decisions).length > 0;
      return hasDecks || hasDecisions;
    } catch {
      return false;
    }
  }, []);

  if (!isSignedIn || !hasLocalData || dismissed) return null;

  const handleMigrate = async () => {
    setMigrating(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const decks = JSON.parse(localStorage.getItem(DECKS_KEY) || '[]');
      const decisions = JSON.parse(localStorage.getItem(DECISIONS_KEY) || '[]');

      await migrateLocalData({ decks, decisions }, token);

      localStorage.setItem(MIGRATED_KEY, new Date().toISOString());
      setDismissed(true);

      // Reload page to re-fetch from server
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(MIGRATED_KEY, 'skipped');
    setDismissed(true);
  };

  return (
    <div className="bg-blue-900/50 border-b border-blue-700 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-blue-200">
          You have saved data on this device. Migrate it to your account to sync across devices?
        </p>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-400">{error}</span>}
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded disabled:opacity-50"
          >
            {migrating ? 'Migrating...' : 'Migrate'}
          </button>
          <button
            onClick={handleSkip}
            className="px-3 py-1 text-blue-300 hover:text-white text-sm"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
