import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { Fonts, rgba, Shadows, TrenaColorPalette } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { startQuickSession } from '@/lib/workouts/repo';

export default function StartWorkoutScreen() {
  const { colors } = useTrenaTheme();
  const haptics = useHaptics();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [isStarting, setIsStarting] = React.useState(false);

  const [actionSheetVisible, setActionSheetVisible] = React.useState(false);
  const [actionSheetConfig, setActionSheetConfig] = React.useState<{
    title?: string;
    message?: string;
    options: ActionSheetOption[];
  }>({ options: [] });

  const showActionSheet = (config: { title?: string; message?: string; options: ActionSheetOption[] }) => {
    setActionSheetConfig(config);
    setActionSheetVisible(true);
  };

  const DumbellManIllustration = require('../../../assets/images/illustrations/activities/dumbell.webp');
  const NotebookManIllustration = require('../../../assets/images/illustrations/activities/notebook_man.webp');
  const RobotIllustration = require('../../../assets/images/illustrations/activities/robot_ai.webp');

  const onQuickWorkout = async () => {
    if (isStarting) return;
    haptics.selection();
    setIsStarting(true);
    try {
      const session = await startQuickSession();
      router.replace(`/activities/session/${session.id}` as any);
    } catch (e: any) {
      showActionSheet({
        title: 'Could not start workout',
        message: e?.message ?? 'Unknown error',
        options: [{ text: 'OK', onPress: () => {} }],
      });
    } finally {
      setIsStarting(false);
    }
  };

  const onAIWorkout = () => {
    haptics.selection();
    showActionSheet({
      title: 'AI workout',
      message: 'Coming soon.',
      options: [{ text: 'OK', onPress: () => {} }],
    });
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
          onPress={() => {
            haptics.selection();
            router.push('/activities/templates' as any);
          }}
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
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>COMING SOON</Text>
              </View>
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
      <ActionSheet
        visible={actionSheetVisible}
        title={actionSheetConfig.title}
        message={actionSheetConfig.message}
        options={actionSheetConfig.options}
        onClose={() => setActionSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: TrenaColorPalette) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 0, paddingBottom: 16, gap: 12 },

  bigCard: {
    flex: 1,
    borderRadius: 22,
    overflow: 'visible', // Changed from 'hidden' to show shadow
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.medium,
  },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.96 },

  cardContentRow: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 22,
    overflow: 'hidden', // Inner clipping
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
    backgroundColor: colors.custom.cardFree,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  freeTitle: { color: colors.custom.onCardFree, fontSize: 32, lineHeight: 30, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  freeSubtitle: { color: rgba(colors.custom.onCardFree, 0.92), fontSize: 16, lineHeight: 22, fontFamily: Fonts.medium, width: '80%' },

  templateCard: {
    backgroundColor: colors.custom.cardTemplate,
    borderColor: rgba(colors.text, 0.1),
  },
  templateTitle: {
    color: colors.custom.onCardTemplate,
    fontSize: 32,
    lineHeight: 30,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
    textAlign: 'right',
  },
  templateSubtitle: {
    color: rgba(colors.custom.onCardTemplate, 0.92),
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.medium,
    textAlign: 'right',
  },

  aiCard: {
    backgroundColor: colors.custom.cardAI,
  },
  aiTitle: { color: colors.custom.onCardAI, fontSize: 32, lineHeight: 30, fontFamily: Fonts.extraBold, letterSpacing: -0.3 },
  aiSubtitle: { color: rgba(colors.custom.onCardAI, 0.92), fontSize: 16, lineHeight: 22, fontFamily: Fonts.medium },

  comingSoonBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  comingSoonText: {
    color: colors.custom.onCardAI,
    fontSize: 11,
    fontFamily: Fonts.extraBold,
    letterSpacing: 0.5,
  },

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
