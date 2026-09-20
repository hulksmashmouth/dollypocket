import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { checkRagHealth } from '../api/rag';
import { checkTtsHealth, TtsError } from '../api/tts';
import { bevel, blockFont, colors, spacing } from '../theme';
import { Checkbox } from './Checkbox';
import { Disclosure } from './Disclosure';
import { ModelPicker } from './ModelPicker';

interface Props {
  visible: boolean;
  baseUrl: string;
  model: string;
  ragUrl: string;
  ragEnabled: boolean;
  ttsUrl: string;
  ttsEnabled: boolean;
  onSave: (model: string, ragEnabled: boolean, ttsEnabled: boolean) => void;
  onClose: () => void;
}

type CheckStatus = 'idle' | 'checking' | 'ok' | 'error';

export function SettingsModal({
  visible,
  baseUrl,
  model,
  ragUrl,
  ragEnabled,
  ttsUrl,
  ttsEnabled,
  onSave,
  onClose,
}: Props) {
  const [modelInput, setModelInput] = useState(model);
  const [ragEnabledInput, setRagEnabledInput] = useState(ragEnabled);
  const [ttsEnabledInput, setTtsEnabledInput] = useState(ttsEnabled);
  const [ragStatus, setRagStatus] = useState<CheckStatus>('idle');
  const [ragChunkCount, setRagChunkCount] = useState<number | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<CheckStatus>('idle');
  const [ttsVoice, setTtsVoice] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setModelInput(model);
      setRagEnabledInput(ragEnabled);
      setTtsEnabledInput(ttsEnabled);
      setRagStatus('idle');
      setRagError(null);
      setTtsStatus('idle');
      setTtsError(null);
    }
  }, [visible, model, ragEnabled, ttsEnabled]);

  const testRagConnection = async () => {
    setRagStatus('checking');
    setRagError(null);
    try {
      const { chunks } = await checkRagHealth(ragUrl);
      setRagChunkCount(chunks);
      setRagStatus('ok');
    } catch (err) {
      setRagStatus('error');
      setRagError(err instanceof Error ? err.message : 'Could not connect.');
    }
  };

  const testTtsConnection = async () => {
    setTtsStatus('checking');
    setTtsError(null);
    try {
      const { voice } = await checkTtsHealth(ttsUrl);
      setTtsVoice(voice);
      setTtsStatus('ok');
    } catch (err) {
      setTtsStatus('error');
      setTtsError(err instanceof TtsError ? err.message : 'Could not connect.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Settings</Text>

          <ModelPicker baseUrl={baseUrl} value={modelInput} onChange={setModelInput} />

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Use imported chat history</Text>
            <Checkbox value={ragEnabledInput} onValueChange={setRagEnabledInput} />
          </View>

          <Pressable style={styles.testButton} onPress={testRagConnection} disabled={!ragEnabledInput}>
            {ragStatus === 'checking' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={[styles.testButtonText, !ragEnabledInput && styles.testButtonTextDisabled]}>
                Check history index
              </Text>
            )}
          </Pressable>

          {ragStatus === 'ok' && (
            <Text style={styles.success}>
              {ragChunkCount === 0
                ? 'Connected, but no history imported yet.'
                : `Connected. ${ragChunkCount} chunks indexed.`}
            </Text>
          )}
          {ragStatus === 'error' && <Text style={styles.errorText}>{ragError}</Text>}

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Read replies aloud</Text>
            <Checkbox value={ttsEnabledInput} onValueChange={setTtsEnabledInput} />
          </View>

          <Pressable style={styles.testButton} onPress={testTtsConnection} disabled={!ttsEnabledInput}>
            {ttsStatus === 'checking' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={[styles.testButtonText, !ttsEnabledInput && styles.testButtonTextDisabled]}>
                Test connection
              </Text>
            )}
          </Pressable>

          {ttsStatus === 'ok' && <Text style={styles.success}>Connected. Voice: {ttsVoice}</Text>}
          {ttsStatus === 'error' && <Text style={styles.errorText}>{ttsError}</Text>}

          <Disclosure title="Tech Specs">
            <SpecRow label="Platform" value={`${Platform.OS} ${Platform.Version ?? ''}`.trim()} />
            <SpecRow label="App version" value={Constants.expoConfig?.version ?? 'unknown'} />
            <SpecRow label="Ollama server" value={baseUrl} />
            <SpecRow label="RAG server" value={ragUrl} />
            <SpecRow label="TTS server" value={ttsUrl} />
            <SpecRow label="Current model" value={model} last />
          </Disclosure>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.actionButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.saveButton]}
            onPress={() => onSave(modelInput.trim(), ragEnabledInput, ttsEnabledInput)}
          >
            <Text style={styles.actionButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SpecRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.specRow, last && styles.specRowLast]}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    paddingTop: 24,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: blockFont,
    marginBottom: 20,
    color: colors.textPrimary,
  },
  label: {
    fontSize: 13,
    fontFamily: blockFont,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  testButton: {
    marginTop: 20,
    alignSelf: 'flex-start',
    backgroundColor: colors.panelBg,
    borderWidth: bevel.width,
    ...bevel.raised,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  testButtonText: {
    color: colors.textPrimary,
    fontFamily: blockFont,
    fontSize: 15,
    fontWeight: '700',
  },
  testButtonTextDisabled: {
    color: colors.textMuted,
  },
  success: {
    color: colors.success,
    fontFamily: blockFont,
    textAlign: 'center',
    marginTop: 4,
  },
  errorText: {
    color: colors.error,
    fontFamily: blockFont,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.bevelDark,
    borderBottomColor: colors.bevelLight,
    marginTop: 24,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
    gap: spacing.sm,
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specLabel: {
    fontFamily: blockFont,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  specValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: blockFont,
    fontSize: 12,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderWidth: bevel.width,
    ...bevel.raised,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.panelBg,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: blockFont,
    color: colors.textPrimary,
  },
});
