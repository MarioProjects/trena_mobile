import { SearchIcon } from '@/components/icons';
import { Fonts, TrenaColors } from '@/constants/theme';
import { learnData } from '@/data/learn';
import { listDistinctFreeExercises } from '@/lib/workouts/repo';
import type { ExerciseRef } from '@/lib/workouts/types';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const learnExercises = learnData.filter((x) => x.type === 'exercise');

export function ExercisePicker({
    value,
    onChange,
    initialOpen = false,
    onClose,
}: {
    value: ExerciseRef | null;
    onChange: (v: ExerciseRef) => void;
    initialOpen?: boolean;
    onClose?: () => void;
}) {
    const [open, setOpen] = React.useState(initialOpen);
    const [term, setTerm] = React.useState('');
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

    const filteredLearn = learnExercises.filter((x) => normalize(x.name).includes(normalize(term)));
    const filteredCustom = customs.filter((x) => normalize(x).includes(normalize(term)));

    const exactMatch =
        filteredLearn.some((x) => normalize(x.name) === normalize(term)) ||
        filteredCustom.some((x) => normalize(x) === normalize(term));

    const handleClose = () => {
        setOpen(false);
        setTerm('');
        onClose?.();
    };

    const onSelect = (ref: ExerciseRef) => {
        onChange(ref);
        handleClose();
    };

    const getLabel = (ref: ExerciseRef | null) => {
        if (!ref) return 'Select exercise';
        if (ref.kind === 'free') return ref.name;
        const hit = learnExercises.find((x) => x.id === ref.learnExerciseId);
        return hit?.name ?? 'Unknown exercise';
    };

    return (
        <>
            {!initialOpen && (
                <Pressable onPress={() => setOpen(true)} style={styles.trigger}>
                    <Text style={[styles.triggerText, !value && styles.placeholder]}>{getLabel(value)}</Text>
                </Pressable>
            )}

            <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
                <SafeAreaView style={styles.safe}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Pick exercise</Text>
                        <Pressable onPress={handleClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>Close</Text>
                        </Pressable>
                    </View>

                    <View style={styles.searchRow}>
                        <SearchIcon color="rgba(236, 235, 228, 0.5)" size={18} />
                        <TextInput
                            placeholder="Search exercise..."
                            placeholderTextColor="rgba(236, 235, 228, 0.5)"
                            style={styles.input}
                            value={term}
                            onChangeText={setTerm}
                            autoFocus
                        />
                    </View>

                    <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
                        {term && !exactMatch ? (
                            <Pressable
                                style={styles.row}
                                onPress={() => onSelect({ kind: 'free', name: term.trim() })}
                            >
                                <View style={[styles.iconBox, { backgroundColor: TrenaColors.primary }]}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000' }}>+</Text>
                                </View>
                                <View>
                                    <Text style={styles.rowTitle}>Create "{term.trim()}"</Text>
                                    <Text style={styles.rowMeta}>Custom exercise</Text>
                                </View>
                            </Pressable>
                        ) : null}

                        {filteredLearn.length === 0 && filteredCustom.length === 0 && !term ? (
                            <Text style={styles.empty}>Start typing to search...</Text>
                        ) : null}

                        {filteredCustom.length > 0 && (
                            <View>
                                <Text style={styles.sectionHeader}>Custom</Text>
                                {filteredCustom.map((name) => (
                                    <Pressable
                                        key={name}
                                        style={styles.row}
                                        onPress={() => onSelect({ kind: 'free', name })}
                                    >
                                        <View style={styles.iconBox} />
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
                                        onPress={() => onSelect({ kind: 'learn', learnExerciseId: ex.id })}
                                    >
                                        <View style={styles.iconBox}>
                                            {/* Placeholder for icon if we had images */}
                                            <Text style={styles.iconText}>{ex.name.slice(0, 1)}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.rowTitle}>{ex.name}</Text>
                                            <Text style={styles.rowMeta}>{ex.equipment.join(', ')}</Text>
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

const styles = StyleSheet.create({
    trigger: {
        borderWidth: 1,
        borderColor: 'rgba(236, 235, 228, 0.12)',
        backgroundColor: 'rgba(236, 235, 228, 0.04)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    triggerText: {
        fontFamily: Fonts.medium,
        fontSize: 15,
        color: TrenaColors.text,
    },
    placeholder: {
        color: 'rgba(236, 235, 228, 0.5)',
    },
    safe: {
        flex: 1,
        backgroundColor: '#141411', // Dark background hardcoded or use theme if accessible
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontFamily: Fonts.bold,
        fontSize: 18,
        color: '#ECEBE4',
    },
    closeBtn: {
        padding: 8,
    },
    closeText: {
        fontFamily: Fonts.bold,
        color: TrenaColors.primary,
        fontSize: 16,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'rgba(236, 235, 228, 0.06)',
        borderRadius: 10,
        gap: 8,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.medium,
        fontSize: 16,
        color: '#ECEBE4',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 6,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(236, 235, 228, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        fontFamily: Fonts.bold,
        color: 'rgba(236, 235, 228, 0.5)',
        fontSize: 16,
    },
    rowTitle: {
        fontFamily: Fonts.semiBold,
        fontSize: 16,
        color: '#ECEBE4',
    },
    rowMeta: {
        fontFamily: Fonts.regular,
        fontSize: 12,
        color: 'rgba(236, 235, 228, 0.6)',
    },
    sectionHeader: {
        fontFamily: Fonts.bold,
        fontSize: 14,
        color: 'rgba(236, 235, 228, 0.4)',
        textTransform: 'uppercase',
        marginTop: 8,
        marginBottom: 4,
    },
    empty: {
        textAlign: 'center',
        color: 'rgba(236, 235, 228, 0.4)',
        marginTop: 40,
        fontFamily: Fonts.medium,
        fontSize: 15,
    },
});
