import { useAuthContext } from '@/hooks/use-auth-context';
import { Redirect } from 'expo-router';
import React from 'react';

export default function HomeScreen() {
  const { isLoading, isLoggedIn } = useAuthContext();

  if (!isLoading && !isLoggedIn) {
    // If the user isn't logged in, send them to the initial hero screen (not the login screen).
    return <Redirect href="/" />;
  }

  // Compatibility route: older links may still point to /home.
  return <Redirect href="/today" />;
}
