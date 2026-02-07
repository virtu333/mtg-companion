import { useEffect, useRef } from 'react';
import { useAuthContext } from '../lib/clerkHelpers';
import { useDeckLibraryStore } from '../stores/deckLibraryStore';
import { useStatsStore } from '../stores/statsStore';
import {
  fetchDecks,
  fetchDecisions,
} from '../lib/api';

/**
 * Watches auth state changes and syncs store data with the server.
 * On sign-in: fetch decks + decisions from server, hydrate stores.
 * On sign-out: revert stores to localStorage.
 * Renders nothing — side-effect only component.
 */
export default function AuthSync() {
  const { isSignedIn, isLoaded, getToken } = useAuthContext();
  const prevSignedIn = useRef(false);

  const setDecks = useDeckLibraryStore((s) => s.setDecks);
  const setGetToken = useDeckLibraryStore((s) => s.setGetToken);
  const setDecisions = useStatsStore((s) => s.setDecisions);
  const setStatsGetToken = useStatsStore((s) => s.setGetToken);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && !prevSignedIn.current) {
      // Just signed in — fetch server data and hydrate stores
      setGetToken(getToken);
      setStatsGetToken(getToken);

      (async () => {
        try {
          const token = await getToken();
          if (!token) return;

          const [serverDecks, serverDecisions] = await Promise.all([
            fetchDecks(token),
            fetchDecisions(token),
          ]);

          if (serverDecks.length > 0) setDecks(serverDecks);
          if (serverDecisions.length > 0) setDecisions(serverDecisions);
        } catch (err) {
          console.error('Failed to sync with server:', err);
        }
      })();
    } else if (!isSignedIn && prevSignedIn.current) {
      // Just signed out — clear server token, revert to localStorage
      setGetToken(null);
      setStatsGetToken(null);
      useDeckLibraryStore.getState().reloadFromLocalStorage();
      useStatsStore.getState().reloadFromLocalStorage();
    }

    prevSignedIn.current = isSignedIn;
  }, [isSignedIn, isLoaded, getToken, setDecks, setGetToken, setDecisions, setStatsGetToken]);

  return null;
}
