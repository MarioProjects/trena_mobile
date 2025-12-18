import { Fonts, TrenaColors } from '@/constants/theme';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { startQuickSession } from '@/lib/workouts/repo';

export default function StartWorkoutScreen() {
  const [isStarting, setIsStarting] = React.useState(false);

  const DumbellManIllustration = require('../../../assets/images/illustrations/activities/dumbell.webp');
  const NotebookManIllustration = require('../../../assets/images/illustrations/activities/notebook_man.webp');
  const RobotIllustration = require('../../../assets/images/illustrations/activities/robot_ai.webp');

  const onQuickWorkout = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      const session = await startQuickSession();
      router.replace(`/activities/session/${session.id}` as any);
    } catch (e: any) {
      Alert.alert('Could not start workout', e?.message ?? 'Unknown error');
    } finally {
      setIsStarting(false);
    }
  };

  const onAIWorkout = () => {
    Alert.alert('AI workout', 'Coming soon.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fast Track"
          onPress={onQuickWorkout}
          disabled={isStarting}
          style={({ pressed }) => [styles.bigCard, styles.freeCard, (pressed || isStarting) && styles.pressed]}
        >
          <View style={styles.cardContentRow}>
            <View style={styles.textCol}>
              <Text style={styles.freeTitle}>Fast Track</Text>
              <Text style={styles.freeSubtitle}>Quick workout for free logging</Text>
            </View>
            <View style={[styles.imageCol, styles.imageColRight]}>
              <Image source={DumbellManIllustration} style={[styles.illustration, styles.illustrationRight]} resizeMode="contain" />
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Template"
          onPress={() => router.push('/activities/templates' as any)}
          style={({ pressed }) => [styles.bigCard, styles.templateCard, pressed && styles.pressed]}
        >
          <View style={[styles.cardContentRow, styles.templateRow]}>
            <View style={[styles.imageCol, styles.imageColLeft, styles.templateImageCol]}>
              <Image
                source={NotebookManIllustration}
                style={[styles.illustration, styles.illustrationLeft, styles.illustrationFlipped]}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.textCol, styles.textColRight, styles.templateTextCol]}>
              <Text
                style={styles.templateTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Template
              </Text>
              <Text style={styles.templateSubtitle}>Use your predefined workout template</Text>
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="AI Plan"
          onPress={onAIWorkout}
          style={({ pressed }) => [styles.bigCard, styles.aiCard, pressed && styles.pressed]}
        >
          <View style={styles.cardContentRow}>
            <View style={styles.textCol}>
              <Text style={styles.aiTitle}>AI Plan</Text>
              <Text style={styles.aiSubtitle}>Generate a workout from your goal</Text>
            </View>
            <View style={[styles.imageCol, styles.imageColRight]}>
              <Image
                source={RobotIllustration}
                style={[styles.illustration, styles.illustrationRight, { opacity: 0.85 }]}
                resizeMode="contain"
              />
            </View>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrenaColors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 16, gap: 12 },

  bigCard: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.96 },

  cardContentRow: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  templateRow: {
    paddingHorizontal: 14,
  },
  textCol: {
    flex: 2,
    gap: 10,
    paddingRight: 14,
    justifyContent: 'center',
  },
  textColRight: {
    paddingRight: 0,
    paddingLeft: 14,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  imageCol: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  templateImageCol: {
    flex: 0.85,
  },
  templateTextCol: {
    flex: 2.15,
    paddingLeft: 10,
  },
  imageColRight: {
    alignItems: 'flex-end',
  },
  imageColLeft: {
    alignItems: 'flex-start',
  },

  freeCard: {
    backgroundColor: TrenaColors.primary,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  freeTitle: { color: '#000', fontSize: 32, lineHeight: 30, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  freeSubtitle: { color: TrenaColors.background, fontSize: 16, lineHeight: 22, fontFamily: Fonts.medium, width: '80%' },

  templateCard: {
    backgroundColor: TrenaColors.secondary,
  },
  templateTitle: {
    color: TrenaColors.text,
    fontSize: 32,
    lineHeight: 30,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  templateSubtitle: {
    color: TrenaColors.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.medium,
    textAlign: 'right',
  },

  aiCard: {
    backgroundColor: TrenaColors.tertiary,
  },
  aiTitle: { color: TrenaColors.background, fontSize: 32, lineHeight: 30, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  aiSubtitle: { color: TrenaColors.background, fontSize: 16, lineHeight: 22, fontFamily: Fonts.medium },

  illustration: {
    position: 'absolute',
    bottom: -20,
    width: 190,
    height: 185,
    //opacity: 0.95,
  },
  illustrationRight: {
    right: -48,
  },
  illustrationLeft: {
    left: -48,
  },
  illustrationFlipped: {
    transform: [{ scaleX: -1 }],
  },
});
