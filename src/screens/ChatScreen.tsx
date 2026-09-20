import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchKnowledge } from '../api/knowledge';
import { streamChat, OllamaError } from '../api/ollama';
import { ChatInput } from '../components/ChatInput';
import { ConversationDrawer } from '../components/ConversationDrawer';
import { IconButton } from '../components/IconButton';
import { MessageBubble } from '../components/MessageBubble';
import { Panel } from '../components/Panel';
import { SettingsModal } from '../components/SettingsModal';
import {
  Conversation,
  deleteConversation,
  getActiveConversationId,
  getConversations,
  saveConversation,
  setActiveConversationId,
  titleFromMessages,
} from '../conversations';
import { SYSTEM_PROMPT } from '../persona';
import * as settings from '../settings';
import { blockFont, colors, headerGradient, spacing } from '../theme';
import { ChatMessage } from '../types';

let nextId = 0;
const newId = () => `${Date.now()}-${nextId++}`;

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [knowledgeUrl, setKnowledgeUrl] = useState('');
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(true);
  const [ttsUrl, setTtsUrl] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const conversationIdRef = useRef<string>(newId());
  const skipNextAutosave = useRef(false);

  const loadSettings = useCallback(async () => {
    setBaseUrl(settings.guessDefaultBaseUrl());
    setModel(await settings.getModel());
    setKnowledgeUrl(settings.guessDefaultKnowledgeUrl());
    setKnowledgeEnabled(await settings.getKnowledgeEnabled());
    setTtsUrl(settings.guessDefaultTtsUrl());
    setTtsEnabled(await settings.getTtsEnabled());
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Resume the last-open conversation on launch, if there is one.
  useEffect(() => {
    (async () => {
      const [allConversations, activeId] = await Promise.all([
        getConversations(),
        getActiveConversationId(),
      ]);
      setConversations(allConversations);
      const active = activeId ? allConversations.find((c) => c.id === activeId) : undefined;
      if (active) {
        conversationIdRef.current = active.id;
        skipNextAutosave.current = true;
        setMessages(active.messages);
        setActiveConversationIdState(active.id);
      }
    })();
  }, []);

  // Autosave the current conversation any time its messages change — this is
  // what "save past chats in memory" means in practice: no explicit save
  // action, every conversation just persists itself as it goes.
  useEffect(() => {
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (messages.length === 0) return;

    const conversation: Conversation = {
      id: conversationIdRef.current,
      title: titleFromMessages(messages),
      messages,
      updatedAt: Date.now(),
    };
    saveConversation(conversation);
    setActiveConversationId(conversation.id);
    setActiveConversationIdState(conversation.id);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversation.id);
      const next = idx >= 0 ? [...prev] : [conversation, ...prev];
      if (idx >= 0) next[idx] = conversation;
      return next.sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, [messages]);

  const handleNewChat = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    conversationIdRef.current = newId();
    skipNextAutosave.current = true;
    setMessages([]);
    setActiveConversationIdState(null);
    setError(null);
    setDrawerVisible(false);
  };

  const handleSelectConversation = (id: string) => {
    const conversation = conversations.find((c) => c.id === id);
    if (!conversation) return;
    abortRef.current?.abort();
    setIsStreaming(false);
    conversationIdRef.current = id;
    skipNextAutosave.current = true;
    setMessages(conversation.messages);
    setActiveConversationIdState(id);
    setActiveConversationId(id);
    setError(null);
    setDrawerVisible(false);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeConversationId) {
      handleNewChat();
    }
  };

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
    if (knowledgeEnabled) {
      try {
        const results = await searchKnowledge(knowledgeUrl, text, 4);
        if (results.length > 0) {
          const context = results
            .map((r) => `[${r.topic} — ${r.title}]\n${r.text}`)
            .join('\n\n---\n\n');
          apiMessages = [
            { id: 'persona', role: 'system', content: SYSTEM_PROMPT },
            {
              id: 'knowledge-context',
              role: 'system',
              content:
                'Relevant background from an imported knowledge base. ' +
                `Use it only if helpful; ignore if irrelevant.\n\n${context}`,
            },
            ...nextMessages,
          ];
        }
      } catch {
        // Knowledge server unreachable or unconfigured — chat without retrieved context.
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
    newModel: string,
    newKnowledgeEnabled: boolean,
    newTtsEnabled: boolean
  ) => {
    await settings.setModel(newModel);
    await settings.setKnowledgeEnabled(newKnowledgeEnabled);
    await settings.setTtsEnabled(newTtsEnabled);
    setModel(newModel);
    setKnowledgeEnabled(newKnowledgeEnabled);
    setTtsEnabled(newTtsEnabled);
    setSettingsVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Panel variant="raised" style={[styles.header, styles.headerBevelOnly]}>
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <IconButton
          size={36}
          onPress={() => setDrawerVisible(true)}
          accessibilityLabel="Past chats"
        >
          <Ionicons name="menu-sharp" size={20} color={colors.textPrimary} />
        </IconButton>

        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={16} color={colors.textPrimary} />
          <Text style={styles.headerTitle}>Dolly Pocket</Text>
          <MaterialCommunityIcons name="butterfly" size={22} color={colors.textPrimary} />
          <Ionicons name="heart" size={14} color={colors.textPrimary} />
        </View>

        <IconButton size={36} onPress={() => setSettingsVisible(true)} accessibilityLabel="Settings">
          <Ionicons name="settings-sharp" size={20} color={colors.textPrimary} />
        </IconButton>
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
        />
        {error && <Text style={styles.errorBanner}>{error}</Text>}
        <ChatInput disabled={isStreaming} onSend={handleSend} />
      </KeyboardAvoidingView>

      <ConversationDrawer
        visible={drawerVisible}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        onClose={() => setDrawerVisible(false)}
      />

      <SettingsModal
        visible={settingsVisible}
        baseUrl={baseUrl}
        model={model}
        knowledgeUrl={knowledgeUrl}
        knowledgeEnabled={knowledgeEnabled}
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
  },
  // Bevel border stays exactly as every other Win95 panel — only the fill
  // becomes a gradient (via the LinearGradient rendered as the first child).
  headerBevelOnly: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
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
  errorBanner: {
    color: colors.error,
    fontFamily: blockFont,
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
});
