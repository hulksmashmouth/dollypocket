import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchKnowledge } from '../api/knowledge';
import { streamChat, OllamaError } from '../api/ollama';
import { ChatInput } from '../components/ChatInput';
import { ConversationDrawer } from '../components/ConversationDrawer';
import { IconButton } from '../components/IconButton';
import { MessageBubble } from '../components/MessageBubble';
import { NowPlayingBar } from '../components/NowPlayingBar';
import { Panel } from '../components/Panel';
import {
  baselineLift,
  BUTTERFLY_ROWS,
  HEART_ROWS,
  PixelButterfly,
  PixelHeart,
} from '../components/PixelArt';
import { PromptSuggestions, shuffledPool } from '../components/PromptSuggestions';
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
import { useSpotify } from '../spotify/useSpotify';
import { blockFont, colors, headerGradient, spacing } from '../theme';
import { ChatMessage } from '../types';

let nextId = 0;
const newId = () => `${Date.now()}-${nextId++}`;

// "play Jolene", "play some Dolly" — handled locally against Spotify instead
// of being sent to the language model.
const PLAY_COMMAND = /^\s*play\s+(.+?)\s*$/i;
const GENERIC_PLAY = /^(some\s+)?(dolly(\s+parton)?|music|something|songs?)$/i;

export function ChatScreen() {
  const spotify = useSpotify();
  const compact = useWindowDimensions().width < 500;
  const titleFontSize = compact ? 24 : 30;
  const butterflyLift = baselineLift(BUTTERFLY_ROWS, titleFontSize);
  const heartsLift = baselineLift(HEART_ROWS, titleFontSize);
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
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Which starters to offer, reshuffled for every new chat so they stay fresh.
  const [suggestionOrder, setSuggestionOrder] = useState(shuffledPool);
  const suggestions = useMemo(
    () =>
      suggestionOrder
        .filter((s) => !s.needsSpotify || spotify.connected)
        .slice(0, 3)
        .map((s) => s.text),
    [suggestionOrder, spotify.connected]
  );
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
    setSuggestionOrder(shuffledPool());
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

  const handlePlayCommand = async (text: string, query: string) => {
    setError(null);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { id: newId(), role: 'user', content: text }]);

    // playDolly() must be reached without an await first: browsers only allow
    // audio to start from within the user gesture that triggered the send.
    let reply: string;
    if (!spotify.connected) {
      reply = 'Connect your Spotify in Settings first, sugar, then ask me again.';
    } else {
      const generic = GENERIC_PLAY.test(query);
      try {
        const tracks = await spotify.playDolly(generic ? null : query);
        reply =
          tracks.length === 0
            ? `I couldn't find "${query}" by Dolly, honey.`
            : generic
              ? "Here's a few of Dolly's finest."
              : `Playing "${tracks[0].name}" by ${tracks[0].artist}.`;
      } catch (err) {
        reply = err instanceof Error ? err.message : 'Something went wrong with Spotify.';
      }
    }

    setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: reply }]);
    setIsStreaming(false);
  };

  const handleSend = async (text: string) => {
    const playMatch = spotify.supported ? text.match(PLAY_COMMAND) : null;
    if (playMatch) {
      await handlePlayCommand(text, playMatch[1]);
      return;
    }

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
      <Panel
        variant="raised"
        style={[styles.header, styles.headerBevelOnly, compact && styles.headerCompact]}
      >
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
          <View style={{ transform: [{ translateY: -butterflyLift }] }}>
            <PixelButterfly />
          </View>
          <Text style={[styles.headerTitle, compact && styles.headerTitleCompact]} numberOfLines={1}>
            Dolly Pocket
          </Text>
          <View style={[styles.hearts, { transform: [{ translateY: -heartsLift }] }]}>
            <PixelHeart />
            <PixelHeart />
            <PixelHeart />
          </View>
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
          indicatorStyle="black"
          renderItem={({ item }) => (
            <MessageBubble message={item} ttsUrl={ttsUrl} ttsEnabled={ttsEnabled} />
          )}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        {error && <Text style={styles.errorBanner}>{error}</Text>}
        {spotify.connected && (
          <NowPlayingBar
            nowPlaying={spotify.nowPlaying}
            error={spotify.error}
            onTogglePlay={spotify.togglePlay}
            onNext={spotify.nextTrack}
            onPrevious={spotify.previousTrack}
          />
        )}
        {messages.length === 0 && (
          <PromptSuggestions prompts={suggestions} disabled={isStreaming} onSelect={handleSend} />
        )}
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
        spotifyUnavailableReason={spotify.unavailableReason}
        spotifyConnected={spotify.connected}
        onSpotifyConnect={spotify.connect}
        onSpotifyDisconnect={spotify.disconnect}
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
  headerCompact: {
    paddingHorizontal: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Three hearts plus a butterfly need more room than a phone-width header
  // has at the full title size, so narrow screens get a smaller title.
  headerTitleCompact: {
    fontSize: 24,
  },
  hearts: {
    flexDirection: 'row',
    gap: 2,
  },
  headerTitle: {
    flexShrink: 1,
    fontSize: 30,
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
