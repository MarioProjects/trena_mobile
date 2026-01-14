import { AuthContext } from '@/hooks/use-auth-context';
import { seedMockData } from '@/lib/data/mock-data'; // Import seed
import { clearUserLocalData } from '@/lib/offline/db';
import { supabase } from '@/lib/supabase';
import { startAutoSync, stopAutoSync } from '@/lib/sync/sync-engine';
import { setOverrideUserId } from '@/lib/workouts/repo'; // Import override
import type { Session, User } from '@supabase/supabase-js';
import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';

const DEMO_USER_ID = 'demo-user-id';
const DEMO_EMAIL = 'test@google.com';

const DEMO_SESSION: Session = {
  access_token: 'demo-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: DEMO_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: DEMO_EMAIL,
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: new Date().toISOString(),
  } as User,
};

export default function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | undefined | null>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url?: string; display_name?: string } | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const refreshProfile = async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile(data);
      } else if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message);
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [session?.user?.id]);

  const signInDemo = async () => {
    setIsDemo(true);
    setOverrideUserId(DEMO_USER_ID);
    await seedMockData(DEMO_USER_ID);
    setSession(DEMO_SESSION);
  };

  const signOutDemo = () => {
    setIsDemo(false);
    setOverrideUserId(null);
    setSession(null);
  };

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
          if (data.session) {
            setSession(data.session);
            lastUserIdRef.current = data.session.user.id;
            startAutoSync();
          } else {
             // If we aren't in demo mode...
             if (!isDemo) {
               setSession(null);
             }
          }
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
      if (isDemo) return; // Ignore supabase updates if in demo mode

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
  }, [isDemo]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isLoggedIn: !!session,
        signInDemo,
        signOutDemo,
        isDemo,
        profile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

