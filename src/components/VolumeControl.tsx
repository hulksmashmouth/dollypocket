import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundLevel, SoundSettings, VOLUME_STEPS } from '../settings';
import { bevel, blockFont, colors, headerGradient, spacing } from '../theme';
import { IconButton } from './IconButton';
import { Panel } from './Panel';

interface Props {
  visible: boolean;
  sound: SoundSettings;
  showMusic: boolean;
  onChange: (sound: SoundSettings) => void;
  onClose: () => void;
}

// Roughly the chat header's height, so the panel drops down just below it
// like the Win95 tray's volume pop-up.
const HEADER_HEIGHT = 64;

// The header speaker button's pop-up: a level and a mute switch each for
// Dolly's voice and the Spotify music. Every change applies immediately.
export function VolumeControl({ visible, sound, showMusic, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const width = Math.min(340, useWindowDimensions().width - spacing.lg * 2);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close volume" />
      <Panel
        variant="raised"
        style={[styles.window, { top: insets.top + HEADER_HEIGHT, right: spacing.lg, width }]}
      >
        <View style={styles.titleBar}>
          <LinearGradient
            colors={headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.title}>Volume Control</Text>
          <IconButton size={24} onPress={onClose} accessibilityLabel="Close volume">
            <Ionicons name="close-sharp" size={14} color={colors.textPrimary} />
          </IconButton>
        </View>
        <View style={styles.body}>
          <VolumeRow
            label="Dolly's Voice"
            value={sound.voice}
            onChange={(voice) => onChange({ ...sound, voice })}
          />
          {showMusic && (
            <VolumeRow
              label="Music"
              value={sound.music}
              onChange={(music) => onChange({ ...sound, music })}
            />
          )}
        </View>
      </Panel>
    </Modal>
  );
}

function VolumeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SoundLevel;
  onChange: (value: SoundLevel) => void;
}) {
  const { level, muted } = value;
  // Nudging the level always unmutes, same as dragging a muted Win95 slider.
  const setLevel = (next: number) =>
    onChange({ level: Math.max(0, Math.min(VOLUME_STEPS, next)), muted: false });
  const silent = muted || level === 0;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <IconButton
          size={36}
          onPress={() => onChange({ level, muted: !muted })}
          accessibilityLabel={muted ? `Unmute ${label}` : `Mute ${label}`}
          accessibilityState={{ checked: muted }}
        >
          <Ionicons
            name={silent ? 'volume-mute-sharp' : level < VOLUME_STEPS / 2 ? 'volume-low-sharp' : 'volume-high-sharp'}
            size={18}
            color={colors.textPrimary}
          />
        </IconButton>
        <IconButton
          size={36}
          onPress={() => setLevel(level - 1)}
          accessibilityLabel={`${label} quieter`}
        >
          <Ionicons name="remove-sharp" size={16} color={colors.textPrimary} />
        </IconButton>
        <View
          style={styles.meter}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${label} volume`}
          accessibilityValue={{ min: 0, max: VOLUME_STEPS, now: muted ? 0 : level }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            setLevel(level + (e.nativeEvent.actionName === 'increment' ? 1 : -1))
          }
        >
          {Array.from({ length: VOLUME_STEPS }, (_, i) => (
            <Pressable
              key={i}
              style={styles.segmentHit}
              onPress={() => setLevel(i + 1 === level && !muted ? i : i + 1)}
            >
              <View
                style={[
                  styles.segment,
                  { height: `${40 + (60 * (i + 1)) / VOLUME_STEPS}%` },
                  i < level && (muted ? styles.segmentMuted : styles.segmentOn),
                ]}
              />
            </Pressable>
          ))}
        </View>
        <IconButton
          size={36}
          onPress={() => setLevel(level + 1)}
          accessibilityLabel={`${label} louder`}
        >
          <Ionicons name="add-sharp" size={16} color={colors.textPrimary} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  window: {
    position: 'absolute',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  title: {
    fontFamily: blockFont,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: blockFont,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meter: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.inputBg,
    borderWidth: bevel.width,
    ...bevel.sunken,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  segmentHit: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 1,
  },
  segment: {
    backgroundColor: colors.panelBg,
  },
  segmentOn: {
    backgroundColor: colors.accent,
  },
  segmentMuted: {
    backgroundColor: colors.placeholder,
  },
});
