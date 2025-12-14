import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type AuthData = {
  session?: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
};

export const AuthContext = createContext<AuthData>({
  session: undefined,
  isLoading: true,
  isLoggedIn: false,
});

export function useAuthContext() {
  return useContext(AuthContext);
}

