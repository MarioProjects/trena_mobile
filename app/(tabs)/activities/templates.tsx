import { ExercisePicker } from '@/components/ExercisePicker';
import { TrashIcon } from '@/components/icons';
import { Fonts, TrenaColors } from '@/constants/theme';
import { learnData } from '@/data/learn';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createTemplate, deleteTemplate, listMethodInstances, listTemplates, updateTemplate } from '@/lib/workouts/repo';
import type {
  ExerciseRef,
  MethodBinding,
  MethodInstanceRow,
  WendlerLiftKey,
  WorkoutTemplate,
  WorkoutTemplateItem,
} from '@/lib/workouts/types';

const learnExercises = learnData.filter((x) => x.type === 'exercise');

function makeLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillSelected : styles.pillUnselected,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.pillText, selected ? styles.pillTextSelected : styles.pillTextUnselected]}>{label}</Text>
    </Pressable>
  );
}

function coerceExerciseName(ref: ExerciseRef) {
  if (ref.kind === 'free') return ref.name;
  const hit = learnExercises.find((x) => x.id === ref.learnExerciseId);
  return hit?.name ?? ref.learnExerciseId;
}

export default function TemplatesScreen() {
  const [templates, setTemplates] = React.useState<WorkoutTemplate[]>([]);
  const [methods, setMethods] = React.useState<MethodInstanceRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [items, setItems] = React.useState<WorkoutTemplateItem[]>([]);

  // Add-item form
  const [newItemExercise, setNewItemExercise] = React.useState<ExerciseRef | null>(null);

  const [itemType, setItemType] = React.useState<'free' | 'bilbo' | 'wendler_531'>('free');
  const [bilboInstanceId, setBilboInstanceId] = React.useState<string>('');
  const [wendlerInstanceId, setWendlerInstanceId] = React.useState<string>('');
  const [wendlerLift, setWendlerLift] = React.useState<WendlerLiftKey>('bench');

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    try {
      const [t, m] = await Promise.all([listTemplates(), listMethodInstances()]);
      setTemplates(t);
      setMethods(m);

      // reasonable defaults
      const bilbos = m.filter((x) => x.method_key === 'bilbo');
      const wendlers = m.filter((x) => x.method_key === 'wendler_531');
      setBilboInstanceId((cur) => cur || bilbos[0]?.id || '');
      setWendlerInstanceId((cur) => cur || wendlers[0]?.id || '');
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const resetEditor = () => {
    setEditingId(null);
    setName('');
    setItems([]);
    setNewItemExercise(null);
    setItemType('free');
  };

  const beginCreate = () => {
    resetEditor();
    setEditingId('NEW');
    setName('New template');
    setItems([]);
  };

  const beginEdit = (t: WorkoutTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setItems(t.items);
    setNewItemExercise(null);
    setItemType('free');
  };

  const onSave = async () => {
    try {
      const trimmed = name.trim();
      if (!trimmed) {
        Alert.alert('Name required', 'Please enter a template name.');
        return;
      }

      if (editingId === 'NEW') {
        await createTemplate({ name: trimmed, items });
      } else if (editingId) {
        await updateTemplate({ id: editingId, patch: { name: trimmed, items } });
      }

      await load();
      resetEditor();
    } catch (e: any) {
      Alert.alert('Could not save template', e?.message ?? 'Unknown error');
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const onDeleteTemplate = async (id: string) => {
    Alert.alert('Delete template?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(id);
            await deleteTemplate(id);
            if (editingId === id) resetEditor();
            setTemplates((cur) => cur.filter((x) => x.id !== id));
            await load({ silent: true });
          } catch (e: any) {
            showToast(e?.message ?? 'Could not delete');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const onAddItem = () => {
    const exercise = newItemExercise;
    if (!exercise) return;

    if (itemType === 'free') {
      setItems((cur) => [...cur, { id: makeLocalId('tpl_item'), type: 'free', exercise }]);
      // Reset after add
      setNewItemExercise(null);
      return;
    }

    if (itemType === 'bilbo') {
      if (!bilboInstanceId) {
        Alert.alert('No Bilbo program', 'Create a Bilbo program first in Programs.');
        return;
      }
      const binding: MethodBinding = { methodKey: 'bilbo' };
      setItems((cur) => [
        ...cur,
        { id: makeLocalId('tpl_item'), type: 'method', exercise, methodInstanceId: bilboInstanceId, binding },
      ]);
      setNewItemExercise(null);
      return;
    }

    if (!wendlerInstanceId) {
      Alert.alert('No 5/3/1 program', 'Create a 5/3/1 program first in Programs.');
      return;
    }
    const binding: MethodBinding = { methodKey: 'wendler_531', lift: wendlerLift };
    setItems((cur) => [
      ...cur,
      { id: makeLocalId('tpl_item'), type: 'method', exercise, methodInstanceId: wendlerInstanceId, binding },
    ]);
    setNewItemExercise(null);
  };

  const removeItem = (id: string) => {
    setItems((cur) => cur.filter((x) => x.id !== id));
  };

  const bilbos = methods.filter((x) => x.method_key === 'bilbo');
  const wendlers = methods.filter((x) => x.method_key === 'wendler_531');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Routines</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/activities/programs' as any)}
              style={({ pressed }) => [styles.secondaryLink, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryLinkText}>Progressions</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={beginCreate}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            >
              <Text style={styles.headerButtonText}>{editingId ? 'Close' : 'New'}</Text>
            </Pressable>
          </View>
        </View>

        {editingId ? (
          <View style={styles.editorCard}>
            <Text style={styles.sectionTitle}>{editingId === 'NEW' ? 'Create template' : 'Edit template'}</Text>

            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Name</Text>
              <TextInput value={name} onChangeText={setName} style={styles.input} />
            </View>

            <View style={{ gap: 10 }}>
              <Text style={styles.label}>Items</Text>
              {items.length === 0 ? <Text style={styles.body}>No items yet.</Text> : null}
              <View style={{ gap: 10 }}>
                {items.map((it, idx) => (
                  <View key={it.id} style={styles.itemRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{`${idx + 1}. ${coerceExerciseName(it.exercise)}`}</Text>
                      <Text style={styles.itemMeta}>
                        {it.type === 'free'
                          ? 'Free'
                          : it.binding.methodKey === 'bilbo'
                            ? 'Bilbo'
                            : `5/3/1 • ${(it.binding as any).lift}`}
                      </Text>
                    </View>
                    <Pressable accessibilityRole="button" onPress={() => removeItem(it.id)} style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}>
                      <Text style={styles.smallButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Add item</Text>

            <View style={{ gap: 12 }}>
              <View style={{ gap: 8 }}>
                <Text style={styles.label}>Exercise</Text>
                <ExercisePicker value={newItemExercise} onChange={setNewItemExercise} />
              </View>

              {newItemExercise ? (
                <>
                  <View style={{ gap: 8 }}>
                    <Text style={styles.label}>Method / Progression (Optional)</Text>
                    <View style={styles.pillsRow}>
                      <Pill label="None" selected={itemType === 'free'} onPress={() => setItemType('free')} />
                      <Pill label="Bilbo" selected={itemType === 'bilbo'} onPress={() => setItemType('bilbo')} />
                      <Pill label="5/3/1" selected={itemType === 'wendler_531'} onPress={() => setItemType('wendler_531')} />
                    </View>
                  </View>

                  {itemType === 'bilbo' ? (
                    <View style={{ gap: 8 }}>
                      <Text style={styles.label}>Bilbo program</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                        {bilbos.length === 0 ? (
                          <Text style={styles.body}>Create a Bilbo program first.</Text>
                        ) : (
                          bilbos.map((m) => (
                            <Pill
                              key={m.id}
                              label={m.name}
                              selected={bilboInstanceId === m.id}
                              onPress={() => setBilboInstanceId(m.id)}
                            />
                          ))
                        )}
                      </ScrollView>
                    </View>
                  ) : null}

                  {itemType === 'wendler_531' ? (
                    <View style={{ gap: 10 }}>
                      <View style={{ gap: 8 }}>
                        <Text style={styles.label}>5/3/1 program</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                          {wendlers.length === 0 ? (
                            <Text style={styles.body}>Create a 5/3/1 program first.</Text>
                          ) : (
                            wendlers.map((m) => (
                              <Pill
                                key={m.id}
                                label={m.name}
                                selected={wendlerInstanceId === m.id}
                                onPress={() => setWendlerInstanceId(m.id)}
                              />
                            ))
                          )}
                        </ScrollView>
                      </View>

                      <View style={{ gap: 8 }}>
                        <Text style={styles.label}>Main lift</Text>
                        <View style={styles.pillsRow}>
                          {(['squat', 'bench', 'deadlift', 'press'] as WendlerLiftKey[]).map((k) => (
                            <Pill key={k} label={k} selected={wendlerLift === k} onPress={() => setWendlerLift(k)} />
                          ))}
                        </View>
                      </View>
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    onPress={onAddItem}
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.secondaryButtonText}>Add to template</Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={resetEditor}
                style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
              >
                <Text style={styles.smallButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onSave}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your templates</Text>
          {!isLoading && templates.length === 0 ? <Text style={styles.body}>No templates yet.</Text> : null}

          <View style={styles.list}>
            {templates.map((t) => {
              const isDeletingThis = deletingId === t.id;
              return (
                <View key={t.id} style={styles.card}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isDeletingThis}
                    onPress={() => beginEdit(t)}
                    style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
                  >
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {t.name}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Delete template"
                          disabled={isDeletingThis}
                          onPress={() => onDeleteTemplate(t.id)}
                          hitSlop={10}
                          style={({ pressed }) => [styles.trashButton, pressed && !isDeletingThis && { opacity: 0.85 }]}
                        >
                          <TrashIcon size={20} color={TrenaColors.accentRed} />
                        </Pressable>
                      </View>
                      <Text style={styles.cardMeta}>{`${t.items.length} item${t.items.length === 1 ? '' : 's'}`}</Text>
                    </View>
                  </Pressable>

                  {isDeletingThis ? (
                    <View style={styles.cardOverlay} pointerEvents="none">
                      <ActivityIndicator color={TrenaColors.accentRed} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TrenaColors.background },
  container: { paddingHorizontal: 20, paddingVertical: 24, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 34, lineHeight: 40, fontFamily: Fonts.extraBold, color: TrenaColors.text, letterSpacing: -0.3 },
  headerButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  headerButtonText: { fontFamily: Fonts.bold, fontSize: 13, color: 'rgba(236, 235, 228, 0.9)' },
  section: { gap: 10, paddingTop: 4 },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: TrenaColors.text },
  body: { color: 'rgba(236, 235, 228, 0.8)', fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: Fonts.bold, fontSize: 13, color: 'rgba(236, 235, 228, 0.9)' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
  },
  list: { gap: 12 },
  card: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cardPressed: { opacity: 0.92 },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: TrenaColors.text },
  cardMeta: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: 'rgba(236, 235, 228, 0.75)' },
  cardPressable: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  trashButton: { paddingLeft: 2, paddingVertical: 2 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 17, 0.55)',
    borderRadius: 14,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
  },
  toastText: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18, color: TrenaColors.text },
  editorCard: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  divider: { height: 1, backgroundColor: 'rgba(236, 235, 228, 0.10)', marginVertical: 4 },
  pillsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingTop: 2 },
  pill: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  pillSelected: { backgroundColor: TrenaColors.primary, borderColor: TrenaColors.primary },
  pillUnselected: { backgroundColor: 'rgba(236, 235, 228, 0.04)', borderColor: 'rgba(236, 235, 228, 0.12)' },
  pillText: { fontFamily: Fonts.semiBold, fontSize: 13, lineHeight: 16 },
  pillTextSelected: { color: TrenaColors.background },
  pillTextUnselected: { color: 'rgba(236, 235, 228, 0.9)' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 18, color: TrenaColors.text },
  itemMeta: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: 'rgba(236, 235, 228, 0.75)' },
  smallButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
  },
  smallButtonText: { fontFamily: Fonts.bold, fontSize: 12, color: 'rgba(236, 235, 228, 0.9)' },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
  },
  secondaryButtonText: { color: TrenaColors.text, fontSize: 15, fontFamily: Fonts.bold },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: TrenaColors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButtonText: { color: '#000', fontSize: 15, fontFamily: Fonts.extraBold },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 2 },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  secondaryLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(236, 235, 228, 0.06)',
  },
  secondaryLinkText: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: TrenaColors.text,
  },
});
