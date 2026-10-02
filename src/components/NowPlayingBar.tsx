import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { NowPlaying } from '../spotify/useSpotify';
import { blockFont, colors, spacing } from '../theme';
import { IconButton } from './IconButton';
import { Panel } from './Panel';

interface Props {
  nowPlaying: NowPlaying | null;
  error: string | null;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

// Win95-style media strip above the chat input: track + transport controls
// while something's playing, or the Spotify error if the player failed.
export function NowPlayingBar({ nowPlaying, error, onTogglePlay, onNext, onPrevious }: Props) {
  if (!nowPlaying && !error) return null;

  return (
    <Panel variant="raised" style={styles.bar}>
      <Ionicons name="musical-notes-sharp" size={16} color={colors.textPrimary} />
      {nowPlaying ? (
        <>
          <Text style={styles.text} numberOfLines={1}>
            {nowPlaying.title} — {nowPlaying.artist}
          </Text>
          <IconButton size={30} onPress={onPrevious} accessibilityLabel="Previous track">
            <Ionicons name="play-skip-back-sharp" size={14} color={colors.textPrimary} />
          </IconButton>
          <IconButton
            size={30}
            onPress={onTogglePlay}
            accessibilityLabel={nowPlaying.paused ? 'Play' : 'Pause'}
          >
            <Ionicons
              name={nowPlaying.paused ? 'play-sharp' : 'pause-sharp'}
              size={14}
              color={colors.textPrimary}
            />
          </IconButton>
          <IconButton size={30} onPress={onNext} accessibilityLabel="Next track">
            <Ionicons name="play-skip-forward-sharp" size={14} color={colors.textPrimary} />
          </IconButton>
        </>
      ) : (
        <Text style={[styles.text, styles.errorText]} numberOfLines={2}>
          {error}
        </Text>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    flex: 1,
    fontFamily: blockFont,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  errorText: {
    color: colors.error,
  },
});
