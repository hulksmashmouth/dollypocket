import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Panel } from './Panel';
import { bevel, blockFont, colors, spacing } from '../theme';

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
    <Panel variant="raised" style={styles.container}>
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
        <View style={[styles.sendButton, canSend ? styles.sendButtonEnabled : styles.sendButtonDisabled]}>
          {disabled ? (
            <ActivityIndicator color={colors.textSecondary} size="small" />
          ) : (
            <Text style={[styles.sendButtonText, !canSend && styles.sendButtonTextDisabled]}>
              Send
            </Text>
          )}
        </View>
      </Pressable>
    </Panel>
  );
}

const INPUT_HEIGHT = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: INPUT_HEIGHT,
    maxHeight: 120,
    backgroundColor: colors.inputBg,
    borderWidth: bevel.width,
    ...bevel.sunken,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: blockFont,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sendButton: {
    height: INPUT_HEIGHT,
    borderWidth: bevel.width,
    ...bevel.raised,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  sendButtonEnabled: {
    backgroundColor: colors.accent,
  },
  sendButtonDisabled: {
    backgroundColor: colors.bg,
  },
  sendButtonText: {
    color: colors.textPrimary,
    fontFamily: blockFont,
    fontWeight: '700',
    fontSize: 16,
  },
  sendButtonTextDisabled: {
    color: colors.textMuted,
  },
});
