import { QuillIcon, SearchIcon } from "@/components/icons";
import { Fonts, rgba } from "@/constants/theme";
import { learnData } from "@/data/learn";
import { useHaptics } from "@/hooks/use-haptics";
import { useTrenaTheme } from "@/hooks/use-theme-context";
import { listDistinctFreeExercises } from "@/lib/workouts/repo";
import type { ExerciseRef } from "@/lib/workouts/types";
import React from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const learnExercises = learnData.filter((x) => x.type === "exercise");

export function ExercisePicker({
  value,
  onChange,
  initialOpen = false,
  onClose,
  allowedExercises,
  placeholderIcon,
}: {
  value: ExerciseRef | null;
  onChange: (v: ExerciseRef) => void;
  initialOpen?: boolean;
  onClose?: () => void;
  allowedExercises?: ExerciseRef[];
  placeholderIcon?: React.ReactNode;
}) {
  const { colors } = useTrenaTheme();
  const haptics = useHaptics();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [open, setOpen] = React.useState(initialOpen);
  const [term, setTerm] = React.useState("");
  const [customs, setCustoms] = React.useState<string[]>([]);
  const [recentUsed, setRecentUsed] = React.useState<string[]>([]);

  // Load custom exercises when opening
  React.useEffect(() => {
    if (open) {
      listDistinctFreeExercises().then((list) => {
        setCustoms(list);
        setRecentUsed(list.slice(0, 5)); // Just take first 5 as "recent" for now (alphabetical though)
      });
    }
  }, [open]);

  const normalize = (s: string) => s.toLowerCase().trim();

  const filteredLearn = learnExercises.filter((x) => {
    const matchesTerm = normalize(x.name).includes(normalize(term));
    if (!allowedExercises) return matchesTerm;
    const isAllowed = allowedExercises.some(
      (allowed) => allowed.kind === "learn" && allowed.learnExerciseId === x.id,
    );
    return matchesTerm && isAllowed;
  });

  const filteredCustom = customs.filter((x) => {
    const matchesTerm = normalize(x).includes(normalize(term));
    if (!allowedExercises) return matchesTerm;
    const isAllowed = allowedExercises.some(
      (allowed) => allowed.kind === "free" && allowed.name === x,
    );
    return matchesTerm && isAllowed;
  });

  const normalizedTerm = normalize(term);
  const exactMatch =
    filteredLearn.some((e) => normalize(e.name) === normalizedTerm) ||
    filteredCustom.some((c) => normalize(c) === normalizedTerm);

  const handleClose = () => {
    setOpen(false);
    setTerm("");
    onClose?.();
  };

  const onSelect = (ref: ExerciseRef) => {
    haptics.selection();
    onChange(ref);
    handleClose();
  };

  const getLabel = (ref: ExerciseRef | null) => {
    if (!ref) return "Select exercise";
    if (ref.kind === "free") return ref.name;
    if (ref.kind === "learn") {
      const hit = learnExercises.find((x) => x.id === ref.learnExerciseId);
      return hit?.name ?? "Unknown exercise";
    }
    return "Method exercise";
  };

  return (
    <>
      {!initialOpen && (
        <Pressable
          onPress={() => {
            haptics.selection();
            setOpen(true);
          }}
          style={styles.trigger}
        >
          <View style={styles.triggerContent}>
            {!value ? placeholderIcon : null}
            <Text
              style={[styles.triggerText, !value && styles.placeholder]}
              numberOfLines={1}
            >
              {getLabel(value)}
            </Text>
          </View>
        </Pressable>
      )}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <Text style={styles.title}>Pick exercise</Text>
            <Pressable
              onPress={() => {
                haptics.selection();
                handleClose();
              }}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <SearchIcon color={rgba(colors.text, 0.5)} size={18} />
            <TextInput
              placeholder="Search exercise..."
              placeholderTextColor={rgba(colors.text, 0.5)}
              style={styles.input}
              value={term}
              onChangeText={setTerm}
              autoFocus
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          >
            {term && !exactMatch && !allowedExercises ? (
              <Pressable
                style={styles.row}
                onPress={() => {
                  const name = term.trim();
                  haptics.selection();
                  setCustoms((prev) => [name, ...prev]);
                  setTerm("");
                  onChange({ kind: "free", name });
                  setOpen(false);
                  onClose?.();
                }}
              >
                <View
                  style={[styles.iconBox, { backgroundColor: colors.primary }]}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: colors.onPrimary,
                    }}
                  >
                    +
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    Create &quot;{term.trim()}&quot;
                  </Text>
                  <Text style={styles.rowMeta}>Custom exercise</Text>
                </View>
              </Pressable>
            ) : null}

            {filteredLearn.length === 0 &&
            filteredCustom.length === 0 &&
            !term ? (
              <Text style={styles.empty}>Start typing to search...</Text>
            ) : null}

            {term &&
            filteredLearn.length === 0 &&
            filteredCustom.length === 0 ? (
              <Text style={styles.empty}>No matching exercises found.</Text>
            ) : null}

            {filteredCustom.length > 0 && (
              <View>
                <Text style={styles.sectionHeader}>Custom</Text>
                {filteredCustom.map((name) => (
                  <Pressable
                    key={name}
                    style={styles.row}
                    onPress={() => onSelect({ kind: "free", name })}
                  >
                    <View style={styles.iconBox}>
                      <QuillIcon size={16} color={rgba(colors.text, 0.5)} />
                    </View>
                    <Text style={styles.rowTitle}>{name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {filteredLearn.length > 0 && (
              <View>
                <Text style={styles.sectionHeader}>Library</Text>
                {filteredLearn.map((ex) => (
                  <Pressable
                    key={ex.id}
                    style={styles.row}
                    onPress={() =>
                      onSelect({ kind: "learn", learnExerciseId: ex.id })
                    }
                  >
                    <View style={styles.iconBox}>
                      {/* Placeholder for icon if we had images */}
                      <Text style={styles.iconText}>{ex.name.slice(0, 1)}</Text>
                    </View>
                    <View>
                      <Text style={styles.rowTitle}>{ex.name}</Text>
                      <Text style={styles.rowMeta}>
                        {ex.equipment.join(", ")}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const createStyles = (colors: {
  background: string;
  primary: string;
  text: string;
  onPrimary: string;
}) =>
  StyleSheet.create({
    trigger: {
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.12),
      backgroundColor: rgba(colors.text, 0.04),
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    triggerContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    triggerText: {
      fontFamily: Fonts.medium,
      fontSize: 15,
      color: colors.text,
    },
    placeholder: {
      color: rgba(colors.text, 0.5),
    },
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: rgba(colors.text, 0.1),
    },
    title: {
      fontFamily: Fonts.bold,
      fontSize: 18,
      color: colors.text,
    },
    closeBtn: {
      padding: 8,
    },
    closeText: {
      fontFamily: Fonts.bold,
      color: colors.primary,
      fontSize: 16,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      margin: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: rgba(colors.text, 0.06),
      borderRadius: 10,
      gap: 8,
    },
    input: {
      flex: 1,
      fontFamily: Fonts.medium,
      fontSize: 16,
      color: colors.text,
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 40,
      gap: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 6,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: rgba(colors.text, 0.1),
      alignItems: "center",
      justifyContent: "center",
    },
    iconText: {
      fontFamily: Fonts.bold,
      color: rgba(colors.text, 0.5),
      fontSize: 16,
    },
    rowTitle: {
      fontFamily: Fonts.semiBold,
      fontSize: 16,
      color: colors.text,
    },
    rowMeta: {
      fontFamily: Fonts.regular,
      fontSize: 12,
      color: rgba(colors.text, 0.6),
    },
    sectionHeader: {
      fontFamily: Fonts.bold,
      fontSize: 14,
      color: rgba(colors.text, 0.4),
      textTransform: "uppercase",
      marginTop: 8,
      marginBottom: 4,
    },
    empty: {
      textAlign: "center",
      color: rgba(colors.text, 0.4),
      marginTop: 40,
      fontFamily: Fonts.medium,
      fontSize: 15,
    },
  });
