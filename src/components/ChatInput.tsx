import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { accentGradient, colors, radii, spacing } from '../theme';
import { GlassView } from './GlassView';

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
}

export function ChatInput({ disabled, onSend }: Props) {
  const [text, setText] = useState('');

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const canSend = !disabled && !!text.trim();

  return (
    <GlassView intensity={50} style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Ask me anything, sugar..."
        placeholderTextColor={colors.placeholder}
        multiline
        editable={!disabled}
      />
      <Pressable onPress={send} disabled={!canSend}>
        {canSend ? (
          <LinearGradient
            colors={accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendButton}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.sendButton, styles.sendButtonDisabled]}>
            {disabled ? (
              <ActivityIndicator color={colors.textSecondary} size="small" />
            ) : (
              <Text style={[styles.sendButtonText, styles.sendButtonTextDisabled]}>Send</Text>
            )}
          </View>
        )}
      </Pressable>
    </GlassView>
  );
}

const INPUT_HEIGHT = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  input: {
    flex: 1,
    minHeight: INPUT_HEIGHT,
    maxHeight: 120,
    backgroundColor: colors.inputBg,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sendButton: {
    height: INPUT_HEIGHT,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  sendButtonDisabled: {
    backgroundColor: colors.glassFillStrong,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  sendButtonTextDisabled: {
    color: colors.textMuted,
  },
});
