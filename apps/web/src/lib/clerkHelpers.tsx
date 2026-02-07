import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { SignInButton, UserButton } from '@clerk/clerk-react';

export interface AuthContextValue {
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue>({
  isSignedIn: false,
  isLoaded: true,
  userId: null,
  getToken: async () => null,
});

/** Renders inside <ClerkProvider> to bridge Clerk hooks into our AuthContext */
export function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const auth = useAuth();

  const value: AuthContextValue = {
    isSignedIn: auth.isSignedIn ?? false,
    isLoaded: auth.isLoaded ?? false,
    userId: auth.userId ?? null,
    getToken: async () => (auth.isSignedIn ? auth.getToken() : null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}

export { SignInButton, UserButton };
