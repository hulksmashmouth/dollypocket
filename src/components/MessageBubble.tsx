import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { startSpeech, stopSpeech, useSpeechStatus } from '../speech';
import { bevel, blockFont, colors } from '../theme';
import { ChatMessage } from '../types';
import { IconButton } from './IconButton';
import { Panel } from './Panel';

interface Props {
  message: ChatMessage;
  ttsUrl?: string;
  ttsEnabled?: boolean;
}

export function MessageBubble({ message, ttsUrl, ttsEnabled }: Props) {
  const isUser = message.role === 'user';
  // New replies are spoken by ChatScreen as they stream in; the button here
  // stops that, or replays the whole message.
  const speechStatus = useSpeechStatus(message.id);

  const showSpeaker = !isUser && ttsEnabled && !!ttsUrl && !!message.content;

  const toggleSpeech = () => {
    if (speechStatus === 'playing' || speechStatus === 'loading') {
      stopSpeech();
      return;
    }
    const session = startSpeech(ttsUrl!, message.id);
    session.push(message.content);
    session.finish();
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
