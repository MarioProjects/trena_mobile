import { Fonts, TrenaColors } from '@/constants/theme';
import { learnData } from '@/data/learn';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LearnItemRedirectScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id?: string; returnTo?: string }>();
  const targetId = typeof id === 'string' ? id : undefined;

  const item = React.useMemo(() => {
    if (!targetId) return undefined;
    return learnData.find((x) => x.id === targetId);
  }, [targetId]);

  const targetHref = React.useMemo(() => {
    if (!item || !targetId) return null;
    const base = `/learn/${item.type}/${targetId}`;
    if (returnTo) {
      return `${base}?returnTo=${encodeURIComponent(returnTo)}` as any;
    }
    return base as any;
  }, [item, targetId, returnTo]);

  // Keep rendering a styled background while we navigate.
  // `Redirect` can briefly render nothing, which may show a white frame.
  React.useEffect(() => {
    if (targetHref) router.replace(targetHref);
  }, [targetHref]);

  if (targetHref) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={TrenaColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Not found</Text>
        <Text style={styles.body}>
          We couldn&apos;t find that learn item. It may have been removed or renamed.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/learn')}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Back to Learn</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: TrenaColors.background,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    padding: 16,
    borderRadius: 16,
    gap: 10,
  },
  title: {
    fontFamily: Fonts.extraBold,
    fontSize: 22,
    lineHeight: 28,
    color: TrenaColors.text,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(236, 235, 228, 0.8)',
  },
  button: {
    marginTop: 6,
    backgroundColor: TrenaColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  buttonText: {
    color: TrenaColors.background,
    fontFamily: Fonts.black,
    fontSize: 14,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});

