import { AuthContext } from '@/hooks/use-auth-context';
import { clearUserLocalData } from '@/lib/offline/db';
import { startAutoSync, stopAutoSync } from '@/lib/sync/sync-engine';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | undefined | null>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const lastUserIdRef = useRef<string | null>(null);

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
          lastUserIdRef.current = data.session?.user?.id ?? null;
          if (data.session?.user?.id) startAutoSync();
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
      const prevUserId = lastUserIdRef.current;
      const nextUserId = nextSession?.user?.id ?? null;

      // Model A privacy default: on logout, wipe cached user data.
      if (prevUserId && !nextUserId) {
        stopAutoSync();
        void clearUserLocalData(prevUserId);
      }

      setSession(nextSession);
      lastUserIdRef.current = nextUserId;
      if (nextUserId) startAutoSync();
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

