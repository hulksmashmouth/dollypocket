import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { synthesizeSpeech } from '../api/tts';
import { bevel, blockFont, colors } from '../theme';
import { ChatMessage } from '../types';
import { IconButton } from './IconButton';
import { Panel } from './Panel';

type SpeechStatus = 'idle' | 'loading' | 'playing' | 'error';

// Only one bubble should be talking at a time — track whatever's currently
// playing here so a new press can stop it before starting the next one.
let stopCurrentSpeech: (() => void) | null = null;

interface Props {
  message: ChatMessage;
  ttsUrl?: string;
  ttsEnabled?: boolean;
  // Set on a reply that just finished streaming, so Dolly reads it aloud
  // without a tap. onAutoSpeakStarted lets the parent clear it right away,
  // so a remount (or scrolling back) never replays it.
  autoSpeak?: boolean;
  onAutoSpeakStarted?: () => void;
}

export function MessageBubble({
  message,
  ttsUrl,
  ttsEnabled,
  autoSpeak,
  onAutoSpeakStarted,
}: Props) {
  const isUser = message.role === 'user';
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  const cleanup = () => {
    playerRef.current?.remove();
    playerRef.current = null;
    if (stopCurrentSpeech === cleanup) stopCurrentSpeech = null;
  };

  useEffect(() => cleanup, []);

  const showSpeaker = !isUser && ttsEnabled && !!ttsUrl && !!message.content;

  useEffect(() => {
    if (!autoSpeak || !showSpeaker) return;
    onAutoSpeakStarted?.();
    startSpeech();
  }, [autoSpeak, showSpeaker]);

  const toggleSpeech = () => {
    if (speechStatus === 'playing' || speechStatus === 'loading') {
      cleanup();
      setSpeechStatus('idle');
      return;
    }
    startSpeech();
  };

  const startSpeech = async () => {
    stopCurrentSpeech?.();
    stopCurrentSpeech = cleanup;
    setSpeechStatus('loading');

    try {
      const audioUrl = await synthesizeSpeech(ttsUrl!, message.content);
      const player = createAudioPlayer({ uri: audioUrl });
      playerRef.current = player;
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          cleanup();
          setSpeechStatus('idle');
        }
      });
      player.play();
      setSpeechStatus('playing');
    } catch {
      cleanup();
      setSpeechStatus('error');
    }
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {isUser ? (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={styles.textUser}>{message.content || '…'}</Text>
        </View>
      ) : (
        <View style={styles.assistantRow}>
          <Panel variant="raised" style={styles.bubble}>
            <Text style={styles.textAssistant}>{message.content || '…'}</Text>
          </Panel>
          {showSpeaker && (
            <IconButton size={30} onPress={toggleSpeech} style={styles.speakerButton}>
              {speechStatus === 'loading' ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Ionicons
                  name={
                    speechStatus === 'playing'
                      ? 'pause-sharp'
                      : speechStatus === 'error'
                        ? 'warning-sharp'
                        : 'volume-high-sharp'
                  }
                  size={16}
                  color={colors.textPrimary}
                />
              )}
            </IconButton>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '80%',
  },
  bubble: {
    flexShrink: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    maxWidth: '80%',
    backgroundColor: colors.accent,
    borderWidth: bevel.width,
    ...bevel.raised,
  },
  textUser: {
    color: colors.textPrimary,
    fontFamily: blockFont,
    fontSize: 16,
  },
  textAssistant: {
    color: colors.textPrimary,
    fontFamily: blockFont,
    fontSize: 16,
  },
  speakerButton: {
    marginLeft: 6,
    marginBottom: 4,
  },
});
