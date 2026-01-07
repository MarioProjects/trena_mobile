import { AddExerciseModal, type AddExerciseSelection } from '@/components/AddExerciseModal';
import { DuplicateIcon, EditIcon, EnergyIcon, MoreHorizIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { ActionSheet, ActionSheetOption } from '@/components/ui/ActionSheet';
import { Toast } from '@/components/ui/Toast';
import { Fonts, rgba } from '@/constants/theme';
import { learnData } from '@/data/learn';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { router, useFocusEffect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkoutsSkeleton } from '@/components/WorkoutsSkeleton';
import { getAddExerciseDraft } from '@/lib/workouts/methods/ui-draft';
import { createTemplate, deleteTemplate, duplicateTemplate, listTemplates, startSessionFromTemplate, updateTemplate } from '@/lib/workouts/repo';
import type {
  ExerciseRef,
  MethodKey,
  WorkoutTemplate,
  WorkoutTemplateItem,
} from '@/lib/workouts/types';

const learnExercises = learnData.filter((x) => x.type === 'exercise');

function makeLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function coerceExerciseName(ref: ExerciseRef) {
  if (ref.kind === 'free') return ref.name;
  const hit = learnExercises.find((x) => x.id === ref.learnExerciseId);
  return hit?.name ?? ref.learnExerciseId;
}

export default function TemplatesScreen() {
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [templates, setTemplates] = React.useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [startingId, setStartingId] = React.useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const [menuTargetId, setMenuTargetId] = React.useState<string | null>(null);
  const menuTarget = templates.find((t) => t.id === menuTargetId) ?? null;

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [items, setItems] = React.useState<WorkoutTemplateItem[]>([]);

  const [addOpen, setAddOpen] = React.useState(false);

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

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    try {
      const t = await listTemplates();
      setTemplates(t);
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
    setAddOpen(false);
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
    setAddOpen(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      const d = getAddExerciseDraft();
      if (d?.shouldReopen) setAddOpen(true);
    }, [])
  );

  const onRequestCreateMethod = (key: MethodKey) => {
    // AddExerciseModal already saved a draft and closed itself.
    if (key === 'amrap') router.push('/activities/methods/amrap/create' as any);
    else router.push('/activities/methods/wendler_531/create' as any);
  };

  const groupedItems = React.useMemo(() => {
    const groups: { supersetId?: string; items: WorkoutTemplateItem[] }[] = [];
    let lastSid: string | undefined = undefined;
    let currentGroup: WorkoutTemplateItem[] = [];

    items.forEach((it) => {
      if (it.supersetId && it.supersetId === lastSid) {
        currentGroup.push(it);
      } else {
        if (currentGroup.length > 0) {
          groups.push({ supersetId: lastSid, items: currentGroup });
        }
        lastSid = it.supersetId;
        currentGroup = [it];
      }
    });
    if (currentGroup.length > 0) {
      groups.push({ supersetId: lastSid, items: currentGroup });
    }
    return groups;
  }, [items]);

  const onConfirmAdd = (selections: AddExerciseSelection[]) => {
    const supersetId = selections.length > 1 ? makeLocalId('ss') : undefined;

    const newItems: WorkoutTemplateItem[] = selections.map((sel) => {
      const exercise = sel.exercise;
      if (!sel.method) {
        return { id: makeLocalId('tpl_item'), type: 'free', exercise, supersetId };
      }
      return {
        id: makeLocalId('tpl_item'),
        type: 'method',
        exercise,
        methodInstanceId: sel.method.methodInstanceId,
        binding: sel.method.binding,
        supersetId,
      };
    });

    setItems((cur) => [...cur, ...newItems]);
    setAddOpen(false);
  };

  const onSave = async () => {
    try {
      const trimmed = name.trim();
      if (!trimmed) {
        showActionSheet({
          title: 'Name required',
          message: 'Please enter a template name.',
          options: [{ text: 'OK', onPress: () => {} }],
        });
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
      showActionSheet({
        title: 'Could not save template',
        message: e?.message ?? 'Unknown error',
        options: [{ text: 'OK', onPress: () => {} }],
      });
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const onDeleteTemplate = async (id: string) => {
    setMenuTargetId(null);
    showActionSheet({
      title: 'Delete template?',
      message: 'This cannot be undone.',
      options: [
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
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
      ],
    });
  };

  const onDuplicateTemplate = async (id: string) => {
    setMenuTargetId(null);
    try {
      setDuplicatingId(id);
      await duplicateTemplate(id);
      await load({ silent: true });
      showToast('Template duplicated');
    } catch (e: any) {
      showToast(e?.message ?? 'Duplicate failed');
    } finally {
      setDuplicatingId(null);
    }
  };

  const onStartFromTemplate = async (t: WorkoutTemplate) => {
    if (startingId) return;
    setMenuTargetId(null);
    try {
      setStartingId(t.id);
      const session = await startSessionFromTemplate({ templateId: t.id });
      router.replace(`/activities/session/${session.id}` as any);
    } catch (e: any) {
      showActionSheet({
        title: 'Could not start workout',
        message: e?.message ?? 'Unknown error',
        options: [{ text: 'OK', onPress: () => {} }],
      });
    } finally {
      setStartingId(null);
    }
  };

  const onEditFromMenu = (t: WorkoutTemplate) => {
    setMenuTargetId(null);
    beginEdit(t);
  };

  const removeItem = (id: string) => {
    setItems((cur) => cur.filter((x) => x.id !== id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>The Routine</Text>
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
                {groupedItems.map((group, gIdx) => {
                  const isSuperset = group.items.length > 1;
                  return (
                    <View key={group.supersetId || group.items[0].id} style={isSuperset ? styles.supersetContainer : undefined}>
                      {isSuperset && (
                        <View style={styles.supersetHeader}>
                          <EnergyIcon size={12} color={colors.tertiary} />
                          <Text style={styles.supersetTitle}>SUPERSET</Text>
                        </View>
                      )}
                      <View style={isSuperset ? styles.supersetInner : undefined}>
                        {group.items.map((it, idx) => {
                          const globalIdx = items.findIndex((i) => i.id === it.id);
                          return (
                            <View
                              key={it.id}
                              style={[
                                styles.itemRow,
                                isSuperset && styles.supersetItemRow,
                                isSuperset && idx === 0 && styles.supersetItemRowFirst,
                                isSuperset && idx === group.items.length - 1 && styles.supersetItemRowLast,
                              ]}
                            >
                              <View style={{ flex: 1, gap: 4 }}>
                                <Text style={styles.itemTitle} numberOfLines={1}>
                                  {`${globalIdx + 1}. ${
                                    it.type === 'method' && it.binding.methodKey === 'amrap'
                                      ? `AMRAP - ${coerceExerciseName(it.exercise)}`
                                      : coerceExerciseName(it.exercise)
                                  }`}
                                </Text>
                                <Text style={styles.itemMeta}>
                                  {it.type === 'free'
                                    ? 'Free'
                                    : it.binding.methodKey === 'amrap'
                                      ? 'AMRAP Method'
                                      : `5/3/1 • ${(it.binding as any).lift}`}
                                </Text>
                              </View>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Remove item"
                                onPress={() => removeItem(it.id)}
                                hitSlop={10}
                                style={({ pressed }) => [styles.trashButton, pressed && styles.pressed]}
                              >
                                <TrashIcon size={20} color={colors.accentRed} />
                              </Pressable>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Add item</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add exercise or method"
              onPress={() => setAddOpen(true)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <PlusIcon size={18} color={colors.text} strokeWidth={1.8} />
              <Text style={styles.secondaryButtonText}>Add exercise or method</Text>
            </Pressable>

          </View>
        ) : null}

        {!editingId ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your templates</Text>
            {isLoading ? (
              <WorkoutsSkeleton />
            ) : templates.length === 0 ? (
              <Text style={styles.body}>No templates yet.</Text>
            ) : (
              <View style={styles.list}>
                {templates.map((t) => {
                  const isBusy =
                    deletingId === t.id || duplicatingId === t.id || startingId === t.id;
                  return (
                    <View key={t.id} style={styles.card}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={isBusy}
                        onPress={() => onStartFromTemplate(t)}
                        style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
                      >
                        <View style={{ flex: 1, gap: 6 }}>
                          <View style={styles.cardHeaderRow}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                              {t.name}
                            </Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Options"
                              disabled={isBusy}
                              onPress={() => setMenuTargetId(t.id)}
                              hitSlop={10}
                              style={({ pressed }) => [styles.iconButton, pressed && !isBusy && { opacity: 0.85 }]}
                            >
                              <MoreHorizIcon size={24} color={colors.text} />
                            </Pressable>
                          </View>
                          <Text style={styles.cardMeta}>{`${t.items.length} item${t.items.length === 1 ? '' : 's'}`}</Text>
                        </View>
                      </Pressable>

                      {isBusy ? (
                        <View style={styles.cardOverlay} pointerEvents="none">
                          <ActivityIndicator color={colors.primary} />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        </ScrollView>

        <Toast 
          message={toast || ''} 
          visible={!!toast} 
          onHide={() => setToast(null)} 
        />

        {!editingId ? (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={beginCreate}
              style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}
            >
              <PlusIcon size={20} color={colors.text} strokeWidth={1.5} />
              <Text style={styles.footerButtonText}>New template</Text>
            </Pressable>
          </View>
        ) : null}

        {editingId ? (
          <View style={styles.editFooter}>
            <Pressable
              accessibilityRole="button"
              onPress={resetEditor}
              style={({ pressed }) => [styles.editSecondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.editSecondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onSave}
              style={({ pressed }) => [styles.editPrimaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.editPrimaryButtonText}>Save</Text>
            </Pressable>
          </View>
        ) : null}

      </View>

      <Modal visible={!!menuTargetId} transparent animationType="fade" onRequestClose={() => setMenuTargetId(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setMenuTargetId(null)}>
          <View style={styles.menuSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              {menuTarget?.name ?? 'Template'}
            </Text>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTarget && onEditFromMenu(menuTarget)}
            >
              <EditIcon size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && onDuplicateTemplate(menuTargetId)}
            >
              <DuplicateIcon size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Duplicate</Text>
            </Pressable>

            <View style={styles.menuSeparator} />

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => menuTargetId && onDeleteTemplate(menuTargetId)}
            >
              <TrashIcon size={20} color={colors.accentRed} />
              <Text style={[styles.menuItemText, { color: colors.accentRed }]}>Remove</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <AddExerciseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onConfirm={onConfirmAdd}
        title="Add to template"
        confirmLabel="Add"
        onRequestCreateMethod={onRequestCreateMethod}
      />
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

const createStyles = (colors: {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  accentRed: string;
  onPrimary: string;
  onSecondary: string;
}) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 20, paddingVertical: 24, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 34, lineHeight: 40, fontFamily: Fonts.extraBold, color: colors.text, letterSpacing: -0.3 },
  section: { gap: 10, paddingTop: 4 },
  sectionTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
  body: { color: rgba(colors.text, 0.8), fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: Fonts.bold, fontSize: 13, color: rgba(colors.text, 0.9) },
  input: {
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    backgroundColor: rgba(colors.text, 0.04),
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: Fonts.medium,
  },
  list: { gap: 12 },
  card: {
    position: 'relative',
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    backgroundColor: rgba(colors.text, 0.04),
    padding: 12,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 12,
  },
  cardPressed: { opacity: 0.92 },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
  cardMeta: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: rgba(colors.text, 0.75) },
  cardPressable: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  iconButton: { padding: 4 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: rgba(colors.background, 0.55),
    borderRadius: 14,
  },
  editorCard: {
    borderWidth: 1,
    borderColor: rgba(colors.text, 0.12),
    backgroundColor: rgba(colors.text, 0.04),
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  divider: { height: 1, backgroundColor: rgba(colors.text, 0.10), marginVertical: 4 },
  pillsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', paddingTop: 2 },
  pill: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillUnselected: { backgroundColor: rgba(colors.text, 0.04), borderColor: rgba(colors.text, 0.12) },
  pillText: { fontFamily: Fonts.semiBold, fontSize: 13, lineHeight: 16 },
  pillTextSelected: { color: colors.onPrimary },
  pillTextUnselected: { color: rgba(colors.text, 0.9) },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTitle: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 18, color: colors.text },
  itemMeta: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: rgba(colors.text, 0.75) },
  supersetContainer: {
    gap: 4,
  },
  supersetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
  },
  supersetTitle: {
    fontFamily: Fonts.extraBold,
    fontSize: 10,
    color: colors.tertiary,
    letterSpacing: 0.5,
  },
  supersetInner: {
    gap: 2,
    borderLeftWidth: 2,
    borderLeftColor: rgba(colors.tertiary, 0.3),
    marginLeft: 6,
    paddingLeft: 10,
  },
  supersetItemRow: {
    borderWidth: 0,
    backgroundColor: rgba(colors.text, 0.03),
    borderRadius: 8,
  },
  supersetItemRowFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  supersetItemRowLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  // used both for template card delete and item remove
  trashButton: { paddingLeft: 2, paddingVertical: 2 },
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: rgba(colors.text, 0.08),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.12),
  },
  secondaryButtonText: { color: colors.text, fontSize: 15, fontFamily: Fonts.bold },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
  primaryButtonText: { color: colors.onPrimary, fontSize: 15, fontFamily: Fonts.extraBold },
  pressed: { transform: [{ scale: 0.99 }], opacity: 0.95 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  footerButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: colors.secondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.12),
    width: '100%',
  },
  footerButtonText: {
    color: colors.onSecondary,
    fontSize: 15,
    fontFamily: Fonts.extraBold,
  },
  editFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.background,
    gap: 10,
  },
  editPrimaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    width: '100%',
  },
  editPrimaryButtonText: { color: colors.onPrimary, fontSize: 15, fontFamily: Fonts.extraBold },
  editSecondaryButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: rgba(colors.text, 0.08),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: rgba(colors.text, 0.12),
    width: '100%',
  },
  editSecondaryButtonText: { color: colors.text, fontSize: 15, fontFamily: Fonts.bold },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  menuTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    color: rgba(colors.text, 0.6),
    textAlign: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  menuItemPressed: { opacity: 0.7 },
  menuItemText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  menuSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: rgba(colors.text, 0.1),
  },
  });
