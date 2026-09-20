import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { streamChat, OllamaError } from '../api/ollama';
import { searchHistory } from '../api/rag';
import { ChatInput } from '../components/ChatInput';
import { MessageBubble } from '../components/MessageBubble';
import { Panel } from '../components/Panel';
import { SettingsModal } from '../components/SettingsModal';
import { SYSTEM_PROMPT } from '../persona';
import * as settings from '../settings';
import { blockFont, colors, spacing } from '../theme';
import { ChatMessage } from '../types';

let nextId = 0;
const newId = () => `${Date.now()}-${nextId++}`;

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [ragUrl, setRagUrl] = useState('');
  const [ragEnabled, setRagEnabled] = useState(true);
  const [ttsUrl, setTtsUrl] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const loadSettings = useCallback(async () => {
    setBaseUrl(await settings.getBaseUrl());
    setModel(await settings.getModel());
    setRagUrl(await settings.getRagUrl());
    setRagEnabled(await settings.getRagEnabled());
    setTtsUrl(await settings.getTtsUrl());
    setTtsEnabled(await settings.getTtsEnabled());
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSend = async (text: string) => {
    setError(null);
    const userMessage: ChatMessage = { id: newId(), role: 'user', content: text };
    const assistantMessage: ChatMessage = { id: newId(), role: 'assistant', content: '' };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, assistantMessage]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let apiMessages: ChatMessage[] = [
      { id: 'persona', role: 'system', content: SYSTEM_PROMPT },
      ...nextMessages,
    ];
    if (ragEnabled) {
      try {
        const results = await searchHistory(ragUrl, text, 4);
        if (results.length > 0) {
          const context = results
            .map((r) => `[${r.title}, ${r.createTime}]\n${r.text}`)
            .join('\n\n---\n\n');
          apiMessages = [
            { id: 'persona', role: 'system', content: SYSTEM_PROMPT },
            {
              id: 'rag-context',
              role: 'system',
              content:
                "Relevant excerpts from the user's past ChatGPT conversations. " +
                `Use them only if helpful; ignore if irrelevant.\n\n${context}`,
            },
            ...nextMessages,
          ];
        }
      } catch {
        // RAG server unreachable or unconfigured — chat without retrieved context.
      }
    }

    try {
      await streamChat(
        baseUrl,
        model,
        apiMessages,
        (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: m.content + delta } : m
            )
          );
        },
        controller.signal
      );
    } catch (err) {
      setError(err instanceof OllamaError ? err.message : 'Something went wrong.');
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleSaveSettings = async (
    newBaseUrl: string,
    newModel: string,
    newRagUrl: string,
    newRagEnabled: boolean,
    newTtsUrl: string,
    newTtsEnabled: boolean
  ) => {
    await settings.setBaseUrl(newBaseUrl);
    await settings.setModel(newModel);
    await settings.setRagUrl(newRagUrl);
    await settings.setRagEnabled(newRagEnabled);
    await settings.setTtsUrl(newTtsUrl);
    await settings.setTtsEnabled(newTtsEnabled);
    setBaseUrl(newBaseUrl);
    setModel(newModel);
    setRagUrl(newRagUrl);
    setRagEnabled(newRagEnabled);
    setTtsUrl(newTtsUrl);
    setTtsEnabled(newTtsEnabled);
    setSettingsVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Panel variant="raised" style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Dolly Pocket</Text>
          <MaterialCommunityIcons name="butterfly" size={22} color={colors.textPrimary} />
        </View>
        <Pressable
          onPress={() => setSettingsVisible(true)}
          hitSlop={12}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
        </Pressable>
      </Panel>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} ttsUrl={ttsUrl} ttsEnabled={ttsEnabled} />
          )}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Say hello to {model || 'your model'} running on {baseUrl || 'Ollama'}.
            </Text>
          }
        />
        {error && <Text style={styles.errorBanner}>{error}</Text>}
        <ChatInput disabled={isStreaming} onSend={handleSend} />
      </KeyboardAvoidingView>

      <SettingsModal
        visible={settingsVisible}
        baseUrl={baseUrl}
        model={model}
        ragUrl={ragUrl}
        ragEnabled={ragEnabled}
        ttsUrl={ttsUrl}
        ttsEnabled={ttsEnabled}
        onSave={handleSaveSettings}
        onClose={() => setSettingsVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: blockFont,
    color: colors.textPrimary,
  },
  listContent: {
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontFamily: blockFont,
    marginTop: 40,
    paddingHorizontal: 32,
  },
  errorBanner: {
    color: colors.error,
    fontFamily: blockFont,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
});
