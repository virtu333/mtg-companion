import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../lib/clerkHelpers';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDeckLibraryStore } from '../stores/deckLibraryStore';
import { useStatsStore } from '../stores/statsStore';
import { useMemo } from 'react';

export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { isSignedIn, isLoaded, userId } = useAuthContext();

  const decks = useDeckLibraryStore((s) => s.decks);
  const decisions = useStatsStore((s) => s.decisions);

  const stats = useMemo(() => ({
    totalDecks: decks.length,
    totalDecisions: decisions.length,
    totalKeeps: decisions.filter((d) => d.decision === 'keep').length,
  }), [decks, decisions]);

  // Redirect anonymous users
  if (isLoaded && !isSignedIn) {
    return <Navigate to="/mulligan" replace />;
  }

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <p className="text-sm text-gray-400 mb-1">User ID</p>
        <p className="text-white font-mono text-sm">{userId}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalDecks}</p>
          <p className="text-sm text-gray-400">Saved Decks</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalDecisions}</p>
          <p className="text-sm text-gray-400">Total Hands</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.totalKeeps}</p>
          <p className="text-sm text-gray-400">Keeps</p>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Your data syncs across devices when signed in.
      </p>
    </div>
  );
}
