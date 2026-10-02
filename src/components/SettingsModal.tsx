import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { checkKnowledgeHealth } from '../api/knowledge';
import { getOllamaVersion } from '../api/ollama';
import { checkTtsHealth, TtsError } from '../api/tts';
import {
  deviceRows,
  KIOSK_HARDWARE,
  KIOSK_SOFTWARE,
  softwareRows,
  SpecRowData,
} from '../techSpecs';
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
  spotifyUnavailableReason: string | null;
  spotifyConnected: boolean;
  onSpotifyConnect: () => void;
  onSpotifyDisconnect: () => void;
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
  spotifyUnavailableReason,
  spotifyConnected,
  onSpotifyConnect,
  onSpotifyDisconnect,
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

  // What the running servers report about themselves, for Tech Specs. Fetched
  // whenever Settings opens; null means that server couldn't be reached.
  const [runtime, setRuntime] = useState<{
    ollama: string | null;
    embedModel: string | null;
    voice: string | null;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const [ollama, knowledge, tts] = await Promise.allSettled([
        getOllamaVersion(baseUrl),
        checkKnowledgeHealth(knowledgeUrl),
        checkTtsHealth(ttsUrl),
      ]);
      if (cancelled) return;
      setRuntime({
        ollama: ollama.status === 'fulfilled' ? ollama.value : null,
        embedModel: knowledge.status === 'fulfilled' ? (knowledge.value.model ?? 'unknown') : null,
        voice: tts.status === 'fulfilled' ? tts.value.voice : null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, baseUrl, knowledgeUrl, ttsUrl]);

  const notRunning = 'not running';
  const runtimeRows: SpecRowData[] = [
    { label: 'Ollama', value: runtime?.ollama ?? (runtime ? notRunning : 'checking…') },
    { label: 'Chat model', value: model },
    { label: 'Embedding model', value: runtime?.embedModel ?? (runtime ? notRunning : 'checking…') },
    {
      label: 'Voice (Piper)',
      value: runtime?.voice ?? (runtime ? notRunning : 'checking…'),
    },
  ];

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
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          indicatorStyle="black"
        >
          <Text style={styles.title}>Settings</Text>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Dolly's Voice</Text>
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

          <View style={styles.divider} />

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

          <Text style={styles.label}>Spotify</Text>
          {spotifyUnavailableReason ? (
            <Text style={styles.note}>{spotifyUnavailableReason}</Text>
          ) : (
            <>
              <Text style={styles.note}>
                {spotifyConnected
                  ? 'Connected — type "play Jolene" in the chat to hear Dolly.'
                  : 'Connect a Premium account, then ask Dolly to play her songs.'}
              </Text>
              <Pressable
                style={styles.testButton}
                onPress={spotifyConnected ? onSpotifyDisconnect : onSpotifyConnect}
              >
                <Text style={styles.testButtonText}>
                  {spotifyConnected ? 'Disconnect Spotify' : 'Connect Spotify'}
                </Text>
              </Pressable>
            </>
          )}

          <Disclosure title="Tech Specs">
            <SpecGroup title="Software" rows={[...softwareRows(), ...runtimeRows]} />
            <SpecGroup
              title="Servers"
              rows={[
                { label: 'Ollama', value: baseUrl },
                { label: 'Knowledge', value: knowledgeUrl },
                { label: 'Voice (TTS)', value: ttsUrl },
              ]}
            />
            <SpecGroup title="This device" rows={deviceRows()} />
            <SpecGroup title="Kiosk build — hardware" rows={KIOSK_HARDWARE} />
            <SpecGroup title="Kiosk build — software" rows={KIOSK_SOFTWARE} last />
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

function SpecGroup({ title, rows, last }: { title: string; rows: SpecRowData[]; last?: boolean }) {
  return (
    <View style={!last && styles.specGroupGap}>
      <Text style={styles.specGroupTitle}>{title}</Text>
      {rows.map((row, i) => (
        <View key={row.label} style={[styles.specRow, i === rows.length - 1 && styles.specRowLast]}>
          <Text style={styles.specLabel}>{row.label}</Text>
          <Text style={styles.specValue}>{row.value}</Text>
        </View>
      ))}
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
  note: {
    fontFamily: blockFont,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
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
  specGroupGap: {
    marginBottom: spacing.lg,
  },
  specGroupTitle: {
    fontFamily: blockFont,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.textPrimary,
    marginBottom: 4,
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
