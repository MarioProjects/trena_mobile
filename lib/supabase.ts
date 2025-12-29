import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const ExpoSecureStoreAdapter: StorageAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const ExpoWebStorageAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const storage = Platform.OS === 'web' ? ExpoWebStorageAdapter : ExpoSecureStoreAdapter;

function readPublicEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY') {
  const raw = process.env?.[name];
  const v = typeof raw === 'string' ? raw.trim() : '';
  return v.length ? v : undefined;
}

export function hasSupabaseConfig() {
  return !!readPublicEnv('EXPO_PUBLIC_SUPABASE_URL') && !!readPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export class SupabaseConfigError extends Error {
  name = 'SupabaseConfigError';
}

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = readPublicEnv('EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = readPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    throw new SupabaseConfigError(
      'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY at build time (EAS Secrets / build env).'
    );
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      // We manually handle OAuth redirects on native via deep links.
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}

/**
 * Backwards-compatible export: behaves like a normal Supabase client, but it is lazily created
 * the first time it's accessed so missing env vars won't crash the app at import-time.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase() as any;
    return client[prop];
  },
});

