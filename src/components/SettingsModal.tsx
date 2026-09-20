import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { checkKnowledgeHealth } from '../api/knowledge';
import { checkTtsHealth, TtsError } from '../api/tts';
import { bevel, blockFont, colors, spacing } from '../theme';
import { Checkbox } from './Checkbox';
import { Disclosure } from './Disclosure';
import { ModelPicker } from './ModelPicker';

interface Props {
  visible: boolean;
  baseUrl: string;
  model: string;
  knowledgeUrl: string;
  knowledgeEnabled: boolean;
  ttsUrl: string;
  ttsEnabled: boolean;
  onSave: (model: string, knowledgeEnabled: boolean, ttsEnabled: boolean) => void;
  onClose: () => void;
}

type CheckStatus = 'idle' | 'checking' | 'ok' | 'error';

export function SettingsModal({
  visible,
  baseUrl,
  model,
  knowledgeUrl,
  knowledgeEnabled,
  ttsUrl,
  ttsEnabled,
  onSave,
  onClose,
}: Props) {
  const [modelInput, setModelInput] = useState(model);
  const [knowledgeEnabledInput, setKnowledgeEnabledInput] = useState(knowledgeEnabled);
  const [ttsEnabledInput, setTtsEnabledInput] = useState(ttsEnabled);
  const [knowledgeStatus, setKnowledgeStatus] = useState<CheckStatus>('idle');
  const [knowledgeInfo, setKnowledgeInfo] = useState<{ chunks: number; topics: string[] } | null>(null);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<CheckStatus>('idle');
  const [ttsVoice, setTtsVoice] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setModelInput(model);
      setKnowledgeEnabledInput(knowledgeEnabled);
      setTtsEnabledInput(ttsEnabled);
      setKnowledgeStatus('idle');
      setKnowledgeError(null);
      setTtsStatus('idle');
      setTtsError(null);
    }
  }, [visible, model, knowledgeEnabled, ttsEnabled]);

  const testKnowledgeConnection = async () => {
    setKnowledgeStatus('checking');
    setKnowledgeError(null);
    try {
      const info = await checkKnowledgeHealth(knowledgeUrl);
      setKnowledgeInfo(info);
      setKnowledgeStatus('ok');
    } catch (err) {
      setKnowledgeStatus('error');
      setKnowledgeError(err instanceof Error ? err.message : 'Could not connect.');
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
            <Text style={styles.label}>Use knowledge base</Text>
            <Checkbox value={knowledgeEnabledInput} onValueChange={setKnowledgeEnabledInput} />
          </View>

          <Pressable
            style={styles.testButton}
            onPress={testKnowledgeConnection}
            disabled={!knowledgeEnabledInput}
          >
            {knowledgeStatus === 'checking' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text
                style={[styles.testButtonText, !knowledgeEnabledInput && styles.testButtonTextDisabled]}
              >
                Check knowledge base
              </Text>
            )}
          </Pressable>

          {knowledgeStatus === 'ok' && (
            <Text style={styles.success}>
              {knowledgeInfo?.chunks === 0
                ? 'Connected, but nothing imported yet.'
                : `Connected. ${knowledgeInfo?.chunks} chunks (${knowledgeInfo?.topics.join(', ')}).`}
            </Text>
          )}
          {knowledgeStatus === 'error' && <Text style={styles.errorText}>{knowledgeError}</Text>}

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
            <SpecRow label="Knowledge server" value={knowledgeUrl} />
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
            onPress={() => onSave(modelInput.trim(), knowledgeEnabledInput, ttsEnabledInput)}
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
