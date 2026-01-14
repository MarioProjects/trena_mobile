import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type AuthData = {
  session?: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signInDemo: () => Promise<void>;
  signOutDemo: () => void;
  isDemo: boolean;
};

export const AuthContext = createContext<AuthData>({
  session: undefined,
  isLoading: true,
  isLoggedIn: false,
  signInDemo: async () => {},
  signOutDemo: () => {},
  isDemo: false,
});

export function useAuthContext() {
  return useContext(AuthContext);
}

