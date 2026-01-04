import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { Fonts, rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ActionSheetOption {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

export function ActionSheet({ visible, title, message, options, onClose }: ActionSheetProps) {
  const { colors } = useTrenaTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const cancelOption = options.find((o) => o.style === 'cancel');
  const otherOptions = options.filter((o) => o.style !== 'cancel');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <SafeAreaView edges={['bottom']} style={styles.sheetContainer}>
          <View style={styles.sheet}>
            {(title || message) && (
              <View style={styles.header}>
                {title && <Text style={styles.title}>{title}</Text>}
                {message && <Text style={styles.message}>{message}</Text>}
              </View>
            )}

            <View style={styles.optionsContainer}>
              {otherOptions.map((option, index) => (
                <Pressable
                  key={`${option.text}-${index}`}
                  style={({ pressed }) => [
                    styles.option,
                    option.style === 'destructive' ? styles.optionDestructive : styles.optionPrimary,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => {
                    onClose();
                    option.onPress();
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      option.style === 'destructive' ? styles.destructiveText : styles.primaryText,
                    ]}
                  >
                    {option.text}
                  </Text>
                </Pressable>
              ))}

              {cancelOption && (
                <Pressable
                  style={({ pressed }) => [
                    styles.option,
                    styles.cancelOption,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => {
                    onClose();
                    cancelOption.onPress();
                  }}
                >
                  <Text style={[styles.optionText, styles.cancelText]}>{cancelOption.text}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    },
    sheetContainer: {
      width: '100%',
      maxWidth: 320,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      overflow: 'hidden',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.1),
    },
    header: {
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: Fonts.bold,
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
    },
    message: {
      fontFamily: Fonts.medium,
      fontSize: 14,
      color: rgba(colors.text, 0.6),
      textAlign: 'center',
      marginTop: 8,
    },
    optionsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 20,
      gap: 10,
    },
    option: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: rgba(colors.text, 0.05),
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.08),
    },
    optionPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionDestructive: {
      backgroundColor: rgba(colors.accentRed, 0.1),
      borderColor: rgba(colors.accentRed, 0.2),
    },
    optionPressed: {
      opacity: 0.7,
      transform: [{ scale: 0.98 }],
    },
    optionText: {
      fontFamily: Fonts.bold,
      fontSize: 16,
      color: colors.text,
    },
    primaryText: {
      color: colors.onPrimary,
    },
    destructiveText: {
      color: colors.accentRed,
    },
    cancelOption: {
      marginTop: 4,
      backgroundColor: rgba(colors.text, 0.08),
      borderWidth: 1,
      borderColor: rgba(colors.text, 0.1),
    },
    cancelText: {
      color: rgba(colors.text, 0.6),
      fontFamily: Fonts.bold,
      fontSize: 16,
    },
  });

