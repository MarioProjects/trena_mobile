import { AuthContext } from '@/hooks/use-auth-context';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import React, { PropsWithChildren, useEffect, useState } from 'react';

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | undefined | null>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // eslint-disable-next-line no-console
          console.error('Error fetching session:', error);
        }
        if (isMounted) {
          setSession(data.session);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isLoggedIn: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

