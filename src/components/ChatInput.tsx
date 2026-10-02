import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Panel } from './Panel';
import { bevel, blockFont, colors, spacing } from '../theme';

interface Props {
  disabled: boolean;
  onSend: (text: string) => void;
}

const MAX_INPUT_HEIGHT = 120;
const BORDER_TOTAL = 4; // 2px sunken bevel on top + bottom

export function ChatInput({ disabled, onSend }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Native multiline inputs grow with their content, but a web <textarea>
  // doesn't — it stays at its row count and scrolls. Grow it by hand (reset to
  // auto first so it can also shrink again as text is deleted). The Send
  // button stretches to match, so the two always stay the same height.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!el?.style) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + BORDER_TOTAL, MAX_INPUT_HEIGHT)}px`;
  }, [text]);

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
        ref={inputRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Ask me anything, sugar..."
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={1}
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

const styles = StyleSheet.create({
  // `stretch` is what keeps the Send button the same height as the message
  // box: it takes whatever height the input actually renders at (one line,
  // or taller as a long message wraps) instead of matching a separate
  // hard-coded number that can drift from the input's real rendered height.
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // lineHeight pins the one-line height to 20 + 2*10 padding + 2*2 border =
  // 44 no matter what the platform's default line spacing for the font is.
  input: {
    flex: 1,
    maxHeight: MAX_INPUT_HEIGHT,
    backgroundColor: colors.inputBg,
    borderWidth: bevel.width,
    ...bevel.sunken,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: blockFont,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  sendButton: {
    flex: 1,
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
