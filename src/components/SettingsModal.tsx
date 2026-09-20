import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { listModels, OllamaError } from '../api/ollama';
import { checkRagHealth } from '../api/rag';
import { checkTtsHealth, TtsError } from '../api/tts';
import { bevel, blockFont, colors, spacing } from '../theme';

interface Props {
  visible: boolean;
  baseUrl: string;
  model: string;
  ragUrl: string;
  ragEnabled: boolean;
  ttsUrl: string;
  ttsEnabled: boolean;
  onSave: (
    baseUrl: string,
    model: string,
    ragUrl: string,
    ragEnabled: boolean,
    ttsUrl: string,
    ttsEnabled: boolean
  ) => void;
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
  const [urlInput, setUrlInput] = useState(baseUrl);
  const [modelInput, setModelInput] = useState(model);
  const [ragUrlInput, setRagUrlInput] = useState(ragUrl);
  const [ragEnabledInput, setRagEnabledInput] = useState(ragEnabled);
  const [ttsUrlInput, setTtsUrlInput] = useState(ttsUrl);
  const [ttsEnabledInput, setTtsEnabledInput] = useState(ttsEnabled);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [status, setStatus] = useState<CheckStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [ragStatus, setRagStatus] = useState<CheckStatus>('idle');
  const [ragChunkCount, setRagChunkCount] = useState<number | null>(null);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<CheckStatus>('idle');
  const [ttsVoice, setTtsVoice] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setUrlInput(baseUrl);
      setModelInput(model);
      setRagUrlInput(ragUrl);
      setRagEnabledInput(ragEnabled);
      setTtsUrlInput(ttsUrl);
      setTtsEnabledInput(ttsEnabled);
      setStatus('idle');
      setError(null);
      setRagStatus('idle');
      setRagError(null);
      setTtsStatus('idle');
      setTtsError(null);
    }
  }, [visible, baseUrl, model, ragUrl, ragEnabled, ttsUrl, ttsEnabled]);

  const testConnection = async () => {
    setStatus('checking');
    setError(null);
    try {
      const models = await listModels(urlInput.trim());
      setAvailableModels(models);
      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setError(err instanceof OllamaError ? err.message : 'Could not connect.');
    }
  };

  const testRagConnection = async () => {
    setRagStatus('checking');
    setRagError(null);
    try {
      const { chunks } = await checkRagHealth(ragUrlInput.trim());
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
      const { voice } = await checkTtsHealth(ttsUrlInput.trim());
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

          <Text style={styles.label}>Ollama server URL</Text>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://192.168.1.x:11434"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={modelInput}
            onChangeText={setModelInput}
            placeholder="llama3.2"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable style={styles.testButton} onPress={testConnection}>
            {status === 'checking' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.testButtonText}>Test connection</Text>
            )}
          </Pressable>

          {status === 'ok' && (
            <Text style={styles.success}>
              Connected. Models: {availableModels.join(', ') || 'none installed'}
            </Text>
          )}
          {status === 'error' && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Use imported chat history</Text>
            <Switch
              value={ragEnabledInput}
              onValueChange={setRagEnabledInput}
              trackColor={{ false: colors.inputBg, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <Text style={styles.label}>RAG server URL</Text>
          <TextInput
            style={styles.input}
            value={ragUrlInput}
            onChangeText={setRagUrlInput}
            placeholder="http://192.168.1.x:11435"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={ragEnabledInput}
          />

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
            <Switch
              value={ttsEnabledInput}
              onValueChange={setTtsEnabledInput}
              trackColor={{ false: colors.inputBg, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <Text style={styles.label}>TTS server URL</Text>
          <TextInput
            style={styles.input}
            value={ttsUrlInput}
            onChangeText={setTtsUrlInput}
            placeholder="http://192.168.1.x:11436"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={ttsEnabledInput}
          />

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
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.actionButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.saveButton]}
            onPress={() =>
              onSave(
                urlInput.trim(),
                modelInput.trim(),
                ragUrlInput.trim(),
                ragEnabledInput,
                ttsUrlInput.trim(),
                ttsEnabledInput
              )
            }
          >
            <Text style={styles.actionButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: bevel.width,
    ...bevel.sunken,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: blockFont,
    color: colors.textPrimary,
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
