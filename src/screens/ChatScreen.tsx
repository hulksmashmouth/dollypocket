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
import { ThinkingModal } from '../components/ThinkingModal';
import { VolumeControl } from '../components/VolumeControl';
import {
  Conversation,
  deleteConversation,
  getConversations,
  saveConversation,
  titleFromMessages,
} from '../conversations';
import { MAX_REPLY_TOKENS, SYSTEM_PROMPT } from '../persona';
import * as settings from '../settings';
import {
  setSpeechVolume,
  SpeechSession,
  startSpeech,
  stopSpeech,
  useIsSpeaking,
} from '../speech';
import { useSpotify } from '../spotify/useSpotify';
import { blockFont, colors, headerGradient, spacing } from '../theme';
import { ChatMessage } from '../types';

let nextId = 0;
const newId = () => `${Date.now()}-${nextId++}`;

// "play Jolene", "play some Dolly" — handled locally against Spotify instead
// of being sent to the language model.
const PLAY_COMMAND = /^\s*play\s+(.+?)\s*$/i;
const GENERIC_PLAY = /^(some\s+)?(dolly(\s+parton)?|music|something|songs?)$/i;

// While Dolly talks, the music drops to this fraction of its set level.
const MUSIC_DUCK = 0.25;

// Cuts a reply that hit the token cap back to its last complete sentence, so
// Dolly never trails off mid-word. Keeps it as-is if no sentence ever ended.
function trimToLastSentence(text: string): string {
  const match = text.match(/^[\s\S]*[.!?…]["'”’)*_]*(?=\s|$)/);
  return match ? match[0] : text;
}

export function ChatScreen() {
  const spotify = useSpotify();
  const compact = useWindowDimensions().width < 500;
  const titleFontSize = compact ? 24 : 30;
  const butterflyLift = baselineLift(BUTTERFLY_ROWS, titleFontSize);
  const heartsLift = baselineLift(HEART_ROWS, titleFontSize);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [volumeVisible, setVolumeVisible] = useState(false);
  const [sound, setSound] = useState(settings.DEFAULT_SOUND);
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
    setSound(await settings.getSound());
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setSpeechVolume(settings.gain(sound.voice));
  }, [sound.voice]);

  const speaking = useIsSpeaking();
  const { setVolume: setMusicVolume } = spotify;
  useEffect(() => {
    setMusicVolume(settings.gain(sound.music) * (speaking ? MUSIC_DUCK : 1));
  }, [sound.music, speaking, setMusicVolume]);

  // The header's speaker icon shows muted when nothing would make a sound.
  const allMuted =
    settings.gain(sound.voice) === 0 && (!spotify.connected || settings.gain(sound.music) === 0);

  const handleSoundChange = (next: settings.SoundSettings) => {
    setSound(next);
    settings.setSound(next);
  };

  // Every launch starts on a fresh chat; past chats stay a tap away in the
  // drawer, so only the list needs loading here.
  useEffect(() => {
    getConversations().then(setConversations);
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
    stopSpeech();
    spotify.stop();
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
    stopSpeech();
    setIsStreaming(false);
    conversationIdRef.current = id;
    skipNextAutosave.current = true;
    setMessages(conversation.messages);
    setActiveConversationIdState(id);
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

  // Dolly's reply exists but no words have arrived yet.
  const lastMessage = messages[messages.length - 1];
  const thinking = isStreaming && lastMessage?.role === 'assistant' && !lastMessage.content;

  // Backs out of a reply that hasn't started writing, dropping its empty bubble.
  const handleCancelThinking = () => {
    abortRef.current?.abort();
    stopSpeech();
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === 'assistant' && !last.content ? prev.slice(0, -1) : prev;
    });
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
      // The previous question rides along so a follow-up like "when did she
      // write it?" still finds the song the conversation is about. Every
      // question here is about Dolly Parton, so the search says so: a bare
      // "Dolly" or "she" otherwise pulls in other Dollys and her sisters.
      const previousQuestion = [...messages].reverse().find((m) => m.role === 'user')?.content;
      const query = `Dolly Parton: ${previousQuestion ? `${previousQuestion}\n${text}` : text}`;
      try {
        const results = await searchKnowledge(knowledgeUrl, query, 5);
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
                "Facts from Dolly Parton's Wikipedia articles that may bear on the user's " +
                'message. For anything about Dolly Parton — her life, family, songs, albums, ' +
                'films, awards, or Dollywood — rely on these facts and never invent dates, ' +
                "titles, names, or numbers. If the answer isn't here, say you're not sure " +
                `instead of guessing. Ignore these facts if the message isn't about her.\n\n${context}`,
            },
            ...nextMessages,
          ];
        }
      } catch {
        // Knowledge server unreachable or unconfigured — chat without retrieved context.
      }
    }

    // Cancelled (or a new chat started) during the knowledge search above.
    if (controller.signal.aborted) {
      setIsStreaming(false);
      abortRef.current = null;
      return;
    }

    // Dolly reads the reply aloud sentence by sentence as it streams in.
    const speech: SpeechSession | null =
      ttsEnabled && ttsUrl ? startSpeech(ttsUrl, assistantMessage.id) : null;
    let reply = '';

    try {
      const { truncated } = await streamChat(
        baseUrl,
        model,
        apiMessages,
        (delta) => {
          reply += delta;
          speech?.push(delta);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id ? { ...m, content: m.content + delta } : m
            )
          );
        },
        controller.signal,
        MAX_REPLY_TOKENS
      );
      if (truncated) {
        reply = trimToLastSentence(reply);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessage.id ? { ...m, content: reply } : m))
        );
      }
      speech?.finish(reply);
    } catch (err) {
      speech?.stop();
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

        <View style={styles.headerButtons}>
          <IconButton size={36} onPress={() => setVolumeVisible(true)} accessibilityLabel="Volume">
            <Ionicons
              name={allMuted ? 'volume-mute-sharp' : 'volume-high-sharp'}
              size={20}
              color={colors.textPrimary}
            />
          </IconButton>
          <IconButton size={36} onPress={() => setSettingsVisible(true)} accessibilityLabel="Settings">
            <Ionicons name="settings-sharp" size={20} color={colors.textPrimary} />
          </IconButton>
        </View>
      </Panel>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          extraData={isStreaming}
          keyExtractor={(m) => m.id}
          indicatorStyle="black"
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              ttsUrl={ttsUrl}
              ttsEnabled={ttsEnabled}
              writing={isStreaming && index === messages.length - 1}
            />
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

      <ThinkingModal visible={thinking} onCancel={handleCancelThinking} />

      <VolumeControl
        visible={volumeVisible}
        sound={sound}
        showMusic={spotify.connected}
        onChange={handleSoundChange}
        onClose={() => setVolumeVisible(false)}
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
        spotifyError={spotify.error}
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
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
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
