import React from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, rgba } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTrenaTheme } from '@/hooks/use-theme-context';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5; // must be odd so we can center
const PADDING = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;
const LOOP_REPEATS = 60; // "infinite-ish" scroll

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function buildLoopData(values: number[]) {
  const data: number[] = [];
  for (let r = 0; r < LOOP_REPEATS; r++) {
    data.push(...values);
  }
  return data;
}

function getCenteredIndexFromOffset(offsetY: number, itemHeight: number, dataLen: number) {
  const raw = Math.round(offsetY / itemHeight);
  return clamp(raw, 0, Math.max(0, dataLen - 1));
}

function WheelColumn({
  label,
  values,
  value,
  onChange,
  styles,
}: {
  label: string;
  values: number[];
  value: number;
  onChange: (next: number) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const listRef = React.useRef<FlatList<number> | null>(null);
  const data = React.useMemo(() => buildLoopData(values), [values]);
  const baseLen = values.length;
  const haptics = useHaptics();

  const initialIndex = React.useMemo(() => {
    const baseIndex = Math.max(0, values.indexOf(value));
    const midRepeat = Math.floor(LOOP_REPEATS / 2);
    return midRepeat * baseLen + baseIndex;
  }, [baseLen, value, values]);

  const scrollToValue = React.useCallback(
    (v: number) => {
      const baseIndex = Math.max(0, values.indexOf(v));
      const midRepeat = Math.floor(LOOP_REPEATS / 2);
      const idx = midRepeat * baseLen + baseIndex;
      listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: false });
    },
    [baseLen, values],
  );

  React.useEffect(() => {
    // keep wheel aligned if parent changes value
    scrollToValue(value);
  }, [scrollToValue, value]);

  const emitFromOffset = React.useCallback(
    (offsetY: number) => {
      const idx = getCenteredIndexFromOffset(offsetY, ITEM_HEIGHT, data.length);
      const v = values[idx % baseLen] ?? values[0] ?? 0;
      onChange(v);
    },
    [baseLen, data.length, onChange, values],
  );

  return (
    <View style={styles.column}>
      <Text style={styles.colLabel}>{label}</Text>
      <View style={styles.wheelViewport}>
        <FlatList
          ref={(r) => {
            listRef.current = r;
          }}
          data={data}
          keyExtractor={(_, idx) => `${label}-${idx}`}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="center"
          decelerationRate="fast"
          bounces={false}
          contentContainerStyle={{ paddingVertical: PADDING }}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={() => {
            // fallback: try again shortly
            setTimeout(() => scrollToValue(value), 0);
          }}
          onMomentumScrollEnd={(e) => emitFromOffset(e.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(e) => emitFromOffset(e.nativeEvent.contentOffset.y)}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.itemText}>{pad2(item)}</Text>
            </View>
          )}
        />
        <View pointerEvents="none" style={styles.selectionFrame} />
      </View>
    </View>
  );
}

export function DurationWheelModal({
  visible,
  title = 'Pick time',
  initialSeconds,
  onCancel,
  onConfirm,
  maxHours = 23,
}: {
  visible: boolean;
  title?: string;
  initialSeconds: number;
  onCancel: () => void;
  onConfirm: (seconds: number) => void;
  maxHours?: number;
}) {
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const init = Math.max(0, Math.round(initialSeconds || 0));
  const initH = Math.floor(init / 3600);
  const initM = Math.floor((init % 3600) / 60);
  const initS = init % 60;

  const [h, setH] = React.useState(initH);
  const [m, setM] = React.useState(initM);
  const [s, setS] = React.useState(initS);

  React.useEffect(() => {
    if (!visible) return;
    setH(clamp(initH, 0, maxHours));
    setM(clamp(initM, 0, 59));
    setS(clamp(initS, 0, 59));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialSeconds, maxHours]);

  const haptics = useHaptics();
  const lastHapticRef = React.useRef(0);
  const haptic = React.useCallback(() => {
    const now = Date.now();
    if (now - lastHapticRef.current < 40) return;
    lastHapticRef.current = now;
    if (Platform.OS === 'web') return;
    haptics.light();
  }, [haptics]);

  const hours = React.useMemo(() => Array.from({ length: maxHours + 1 }, (_, i) => i), [maxHours]);
  const mins = React.useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const secs = React.useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        {/* tap outside sheet to close */}
        <Pressable style={[StyleSheet.absoluteFill, styles.backdropPressable]} onPress={onCancel} />

        {/* sheet is a plain View so it doesn't steal scroll gestures */}
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.headerBtn}>
              <Text style={styles.headerBtnTextMuted}>Cancel</Text>
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => onConfirm(h * 3600 + m * 60 + s)}
              style={styles.headerBtn}
            >
              <Text style={styles.headerBtnText}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.wheelsRow}>
            <WheelColumn
              label="hh"
              values={hours}
              value={clamp(h, 0, maxHours)}
              styles={styles}
              onChange={(v) => {
                setH(v);
                haptic();
              }}
            />
            <Text style={styles.colon}>:</Text>
            <WheelColumn
              label="mm"
              values={mins}
              value={clamp(m, 0, 59)}
              styles={styles}
              onChange={(v) => {
                setM(v);
                haptic();
              }}
            />
            <Text style={styles.colon}>:</Text>
            <WheelColumn
              label="ss"
              values={secs}
              value={clamp(s, 0, 59)}
              styles={styles}
              onChange={(v) => {
                setS(v);
                haptic();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: { surface: string; text: string; primary: string }) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      padding: 16,
      justifyContent: 'flex-end',
    },
    backdropPressable: {
      zIndex: 0,
    },
    sheet: {
      zIndex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: rgba(colors.text, 0.1),
    },
    title: { flex: 1, textAlign: 'center', fontFamily: Fonts.bold, color: colors.text, fontSize: 14 },
    headerBtn: { paddingHorizontal: 8, paddingVertical: 6, minWidth: 72 },
    headerBtnText: { textAlign: 'right', fontFamily: Fonts.bold, color: colors.primary, fontSize: 14 },
    headerBtnTextMuted: { textAlign: 'left', fontFamily: Fonts.bold, color: rgba(colors.text, 0.75), fontSize: 14 },

    wheelsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 10,
    },
    colon: {
      fontFamily: Fonts.extraBold,
      color: rgba(colors.text, 0.75),
      fontSize: 18,
      marginHorizontal: 6,
      marginTop: 18, // align with wheel items (label above)
    },
    column: { width: 80, alignItems: 'center' },
    colLabel: { fontFamily: Fonts.bold, fontSize: 12, color: rgba(colors.text, 0.45), marginBottom: 6 },
    wheelViewport: {
      height: ITEM_HEIGHT * VISIBLE_ITEMS,
      width: '100%',
    },
    item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
    itemText: { fontFamily: Fonts.extraBold, fontSize: 18, color: colors.text },
    selectionFrame: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: PADDING,
      height: ITEM_HEIGHT,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: rgba(colors.text, 0.18),
      backgroundColor: rgba(colors.text, 0.03),
    },
  });


