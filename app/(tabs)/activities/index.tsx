import { Fonts, TrenaColors } from '@/constants/theme';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CharacterIcon, DuplicateIcon, MoreHorizIcon, PlusIcon, TrashIcon, XIcon } from '@/components/icons';
import { WorkoutsSkeleton } from '@/components/WorkoutsSkeleton';
import { deleteSession, duplicateSession, listSessions, updateSessionTitle } from '@/lib/workouts/repo';
import type { WorkoutSessionRow } from '@/lib/workouts/types';

const DrinkWaterIllustration = require('../../../assets/images/illustrations/activities/drink_water_yellow.webp');

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function bucketSessionsByDay(sessions: WorkoutSessionRow[]) {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  const today: WorkoutSessionRow[] = [];
  const future: WorkoutSessionRow[] = [];
  const recent: WorkoutSessionRow[] = [];

  for (const s of sessions) {
    const t = new Date(s.started_at).getTime();
    if (Number.isNaN(t)) {
      recent.push(s);
      continue;
    }
    if (t >= todayStart && t < tomorrowStart) today.push(s);
    else if (t >= tomorrowStart) future.push(s);
    else recent.push(s);
  }

  // Keep UX sensible: today/recent are usually newest-first, future earliest-first.
  today.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  recent.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  future.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  return { today, future, recent };
}

const PROGRAM_THRESHOLD_MS = 15 * 60 * 1000; // keep consistent with session screen

export default function ActivitiesIndexScreen() {
  const [sessions, setSessions] = React.useState<WorkoutSessionRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);
  const [menuTargetId, setMenuTargetId] = React.useState<string | null>(null);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [isSavingRename, setIsSavingRename] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const hasLoaded = React.useRef(false);

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    const shouldLoad = !opts?.silent && !hasLoaded.current;
    if (shouldLoad) setIsLoading(true);
    try {
      // Fetch a bigger window so today/future/recent sections have enough data.
      const rows = await listSessions(200);
      setSessions(rows);
      hasLoaded.current = true;
    } finally {
      if (shouldLoad) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const onDelete = (id: string) => {
    setMenuTargetId(null);
    Alert.alert('Delete workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(id);
            await deleteSession(id);
            setSessions((cur) => cur.filter((x) => x.id !== id));
            await load({ silent: true });
          } catch (e: any) {
            showToast(e?.message ?? 'Delete failed');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const onDuplicate = async (id: string) => {
    setMenuTargetId(null);
    try {
      setDuplicatingId(id);
      await duplicateSession(id);
      await load({ silent: true }); // Reload to show new session
      showToast('Workout duplicated');
    } catch (e: any) {
      showToast(e?.message ?? 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const openRename = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    setMenuTargetId(null);
    setRenamingId(id);
    setRenameValue(s?.title ?? '');
  };

  const closeRename = () => {
    setRenamingId(null);
    setRenameValue('');
    setIsSavingRename(false);
  };

  const onSaveRename = async () => {
    if (!renamingId) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) {
      showToast('Workout name cannot be empty');
      return;
    }
    try {
      setIsSavingRename(true);
      const updated = await updateSessionTitle({ id: renamingId, title: nextTitle });
      setSessions((cur) => cur.map((x) => (x.id === updated.id ? { ...x, title: updated.title } : x)));
      showToast('Workout renamed');
      closeRename();
    } catch (e: any) {
      showToast(e?.message ?? 'Rename failed');
      setIsSavingRename(false);
    }
  };

  const { today, future, recent } = React.useMemo(() => bucketSessionsByDay(sessions), [sessions]);
  const totalCount = sessions.length;

  const renderSessionCard = (s: WorkoutSessionRow) => {
    const startedMs = new Date(s.started_at).getTime();
    const isScheduled = !s.ended_at && !Number.isNaN(startedMs) && startedMs > Date.now() + PROGRAM_THRESHOLD_MS;
    const inProgress = !s.ended_at && !isScheduled;
    const exCount = s.snapshot?.exercises?.length ?? 0;
    const isBusy = deletingId === s.id || duplicatingId === s.id;
    return (
      <View key={s.id} style={styles.card}>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => router.push(`/activities/session/${s.id}` as any)}
          style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {s.title}
              </Text>
              <View
                style={[
                  styles.badge,
                  isScheduled ? styles.badgeScheduled : inProgress ? styles.badgeInProgress : styles.badgeDone,
                ]}
              >
                <Text style={styles.badgeText}>{isScheduled ? 'SCHEDULED' : inProgress ? 'IN PROGRESS' : 'DONE'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Options"
                disabled={isBusy}
                onPress={() => setMenuTargetId(s.id)}
                hitSlop={10}
                style={({ pressed }) => [styles.iconButton, pressed && !isBusy && { opacity: 0.85 }]}
              >
                <MoreHorizIcon size={24} color={TrenaColors.text} />
              </Pressable>
            </View>
            <Text style={styles.cardMeta}>{`${formatDate(s.started_at)} • ${exCount} exercise${exCount === 1 ? '' : 's'}`}</Text>
          </View>
        </Pressable>

        {isBusy ? (
          <View style={styles.cardOverlay} pointerEvents="none">
            <ActivityIndicator color={TrenaColors.primary} />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Activities</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today workouts</Text>
            {isLoading ? (
              <WorkoutsSkeleton />
            ) : totalCount === 0 ? (
              <>
                <Text style={styles.body}>No workouts yet. Start your first session to see it here.</Text>
                <View style={styles.emptyIllustrationWrapper}>
                  <Image source={DrinkWaterIllustration} style={styles.emptyImage} resizeMode="contain" />
                </View>
              </>
            ) : today.length === 0 ? (
              <Text style={styles.body}>No workouts logged today.</Text>
            ) : (
              <View style={styles.list}>{today.map(renderSessionCard)}</View>
            )}
          </View>

          {!isLoading && totalCount > 0 ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Future workouts</Text>
                {future.length === 0 ? (
                  <Text style={styles.body}>No future workouts.</Text>
                ) : (
                  <View style={styles.list}>{future.map(renderSessionCard)}</View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent workouts</Text>
                {recent.length === 0 ? (
                  <Text style={styles.body}>No recent workouts.</Text>
                ) : (
                  <View style={styles.list}>{recent.map(renderSessionCard)}</View>
                )}
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/activities/start' as any)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <PlusIcon size={20} color="#141B34" strokeWidth={1.5} />
            <Text style={styles.primaryButtonText}>Start workout</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={!!menuTargetId} transparent animationType="fade" onRequestClose={() => setMenuTargetId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuTargetId(null)}>
          <View style={styles.menuSheet} onStartShouldSetResponder={() => true}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && openRename(menuTargetId)}
            >
              <CharacterIcon size={20} color={TrenaColors.text} />
              <Text style={styles.menuItemText}>Rename Workout</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && onDuplicate(menuTargetId)}
            >
              <DuplicateIcon size={20} color={TrenaColors.text} />
              <Text style={styles.menuItemText}>Duplicate Workout</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && onDelete(menuTargetId)}
            >
              <TrashIcon size={20} color={TrenaColors.accentRed} />
              <Text style={[styles.menuItemText, { color: TrenaColors.accentRed }]}>Remove Workout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!renamingId} transparent animationType="fade" onRequestClose={closeRename}>
        <Pressable style={styles.modalBackdrop} onPress={closeRename}>
          <View style={styles.renameCard} onStartShouldSetResponder={() => true}>
            <View style={styles.renameHeader}>
              <Text style={styles.renameTitle}>Rename workout</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeRename}
                hitSlop={10}
                style={({ pressed }) => [styles.renameClose, pressed && { opacity: 0.8 }]}
              >
                <XIcon size={18} color={TrenaColors.text} />
              </Pressable>
            </View>

            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Workout name"
              placeholderTextColor="rgba(236, 235, 228, 0.5)"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSaveRename}
              editable={!isSavingRename}
              style={styles.renameInput}
            />

            <View style={styles.renameActionsRow}>
              <Pressable
                accessibilityRole="button"
                onPress={closeRename}
                disabled={isSavingRename}
                style={({ pressed }) => [styles.secondaryButton, pressed && !isSavingRename && styles.pressed, { flex: 1 }]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onSaveRename}
                disabled={isSavingRename}
                style={({ pressed }) => [styles.primaryButton, (pressed || isSavingRename) && styles.pressed, { flex: 1 }]}
              >
                <Text style={styles.primaryButtonText}>{isSavingRename ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: TrenaColors.background,
  },
  content: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 14,
    flexGrow: 1,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Fonts.extraBold,
    color: TrenaColors.text,
    letterSpacing: -0.3,
  },
  section: {
    gap: 10,
    paddingTop: 6,
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: 18,
    lineHeight: 22,
    color: TrenaColors.text,
    letterSpacing: -0.2,
  },
  body: {
    color: 'rgba(236, 235, 228, 0.8)',
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    // kept for compatibility if reused elsewhere
  },
  emptyImage: {
    width: '100%',
    //maxWidth: '80%',
    height: '100%',
  },
  emptyIllustrationWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 24,
    height: 260,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: TrenaColors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    width: '100%',
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 15,
    fontFamily: Fonts.extraBold,
  },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236, 235, 228, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    minWidth: 110,
  },
  secondaryButtonText: {
    color: TrenaColors.text,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  list: {
    gap: 12,
  },
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
  cardPressable: {
    flex: 1,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 20, 17, 0.55)',
    borderRadius: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    color: TrenaColors.text,
    flex: 1,
  },
  cardMeta: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(236, 235, 228, 0.75)',
  },
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeInProgress: {
    borderColor: 'rgba(255, 214, 0, 0.35)',
    backgroundColor: 'rgba(255, 214, 0, 0.10)',
  },
  badgeDone: {
    borderColor: 'rgba(70, 255, 150, 0.25)',
    backgroundColor: 'rgba(70, 255, 150, 0.08)',
  },
  badgeScheduled: {
    borderColor: 'rgba(59, 130, 246, 0.45)',
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
  badgeText: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.5,
    color: 'rgba(236, 235, 228, 0.85)',
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
  toastText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: TrenaColors.text,
  },
  iconButton: {
    padding: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: TrenaColors.background,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#1C1C1E', // Dark sheet color
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 16, // Safe area hint
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuItemText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: TrenaColors.text,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(236, 235, 228, 0.1)',
  },

  renameCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    padding: 16,
    gap: 12,
  },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  renameTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 16,
    color: TrenaColors.text,
  },
  renameClose: {
    padding: 6,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: 'rgba(236, 235, 228, 0.12)',
    backgroundColor: 'rgba(236, 235, 228, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: TrenaColors.text,
    fontFamily: Fonts.medium,
    fontSize: 14,
  },
  renameActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
