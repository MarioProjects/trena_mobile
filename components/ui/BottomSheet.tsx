import { useHaptics } from '@/hooks/use-haptics';
import React from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Sheet "expanded" height as percent of screen height.
   * Default: 0.9
   */
  maxHeightPct?: number;
  /**
   * Sheet "collapsed" height as percent of screen height (how tall it is when first opened).
   * Default: 0.7
   */
  initialHeightPct?: number;
  /**
   * Background color for the sheet surface (so it doesn't look transparent while dragging).
   */
  sheetBackgroundColor?: string;
  /**
   * Handle color.
   */
  handleColor?: string;
  children: React.ReactNode;
};

function clamp(v: number, min: number, max: number) {
  'worklet';
  return Math.max(min, Math.min(max, v));
}

const HANDLE_HEIGHT = 36;

export function BottomSheet({
  visible,
  onClose,
  maxHeightPct = 0.9,
  initialHeightPct = 0.7,
  sheetBackgroundColor,
  handleColor,
  children,
}: BottomSheetProps) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const maxPct = maxHeightPct;
  const initialPct = Math.min(initialHeightPct, maxPct);

  const expandedH = Math.max(320, Math.floor(screenH * maxPct));
  const collapsedH = Math.max(240, Math.min(expandedH, Math.floor(screenH * initialPct)));
  const collapsedTranslateY = Math.max(0, expandedH - collapsedH);

  const [isPresented, setIsPresented] = React.useState(visible);

  const translateY = useSharedValue(expandedH);
  const startY = useSharedValue(0);

  // Keep modal mounted while animating out.
  React.useEffect(() => {
    if (visible) {
      setIsPresented(true);
      haptics.light();
    }
  }, [visible, haptics]);

  React.useEffect(() => {
    if (!isPresented) return;

    if (visible) {
      // Enter: start off-screen then snap to collapsed.
      translateY.value = expandedH;
      translateY.value = withSpring(collapsedTranslateY, {
        damping: 30,
        stiffness: 320,
        overshootClamping: true,
      });
      return;
    }

    // Exit: slide fully down, then unmount.
    translateY.value = withTiming(expandedH, { duration: 180 }, (finished) => {
      if (finished) runOnJS(setIsPresented)(false);
    });
  }, [collapsedTranslateY, expandedH, isPresented, translateY, visible]);

  const requestClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const pan = React.useMemo(() => {
    return Gesture.Pan()
      .onBegin(() => {
        startY.value = translateY.value;
      })
      .onUpdate((e) => {
        translateY.value = clamp(startY.value + e.translationY, 0, expandedH);
      })
      .onEnd((e) => {
        const y = translateY.value;
        const snapExpanded = 0;
        const snapCollapsed = collapsedTranslateY;
        const snapClosed = expandedH;

        const shouldClose = y > expandedH * 0.7 || e.velocityY > 1800;
        if (shouldClose) {
          translateY.value = withTiming(snapClosed, { duration: 180 }, (finished) => {
            if (finished) runOnJS(requestClose)();
          });
          return;
        }

        // Snap between collapsed and expanded (no overshoot).
        const target =
          e.velocityY < -700
            ? snapExpanded
            : e.velocityY > 700
              ? snapCollapsed
              : Math.abs(y - snapExpanded) < Math.abs(y - snapCollapsed)
                ? snapExpanded
                : snapCollapsed;

        translateY.value = withSpring(target, {
          damping: 28,
          stiffness: 300,
          overshootClamping: true,
        });
      });
  }, [collapsedTranslateY, expandedH, requestClose, startY, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Dynamic content height based on current translateY position
  // This ensures ScrollView frame matches visible area for proper scrolling
  const contentStyle = useAnimatedStyle(() => {
    const visibleHeight = expandedH - translateY.value;
    // Subtract handle height and bottom safe area from visible height
    const contentHeight = Math.max(0, visibleHeight - HANDLE_HEIGHT - insets.bottom);
    return {
      height: contentHeight,
    };
  });

  if (!isPresented) return null;

  return (
    <Modal visible={isPresented} transparent animationType="none" onRequestClose={requestClose}>
      <GestureHandlerRootView style={styles.ghRoot}>
        <View style={styles.backdrop}>
          <Pressable style={[StyleSheet.absoluteFill, styles.backdropPressable]} onPress={requestClose} />

          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
              {
                height: expandedH,
                backgroundColor: sheetBackgroundColor ?? '#fff',
              },
            ]}
          >
            {/* Drag only on handle so inner content can scroll/tap */}
            <GestureDetector gesture={pan}>
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: handleColor ?? 'rgba(0,0,0,0.25)' }]} />
              </View>
            </GestureDetector>
            <Animated.View style={[styles.content, contentStyle]}>
              {children}
            </Animated.View>
            {/* Bottom safe area spacer */}
            <View style={{ height: insets.bottom }} />
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ghRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    zIndex: 0,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
    zIndex: 2,
    elevation: 12,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    height: HANDLE_HEIGHT,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
  },
  content: {
    overflow: 'hidden',
  },
});

