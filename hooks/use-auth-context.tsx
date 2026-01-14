import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type AuthData = {
  session?: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signInDemo: () => Promise<void>;
  signOutDemo: () => void;
  isDemo: boolean;
  profile: { avatar_url?: string; display_name?: string } | null;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthData>({
  session: undefined,
  isLoading: true,
  isLoggedIn: false,
  signInDemo: async () => {},
  signOutDemo: () => {},
  isDemo: false,
  profile: null,
  refreshProfile: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

