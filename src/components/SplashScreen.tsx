import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { blockFont, colors, headerGradient, spacing } from '../theme';
import { DollyDoll } from './DollyDoll';
import { Panel } from './Panel';
import { PixelButterfly, PixelHeart } from './PixelArt';

const SEGMENTS = 12;
const SEGMENT_MS = 140;
const FADE_MS = 400;

// Launch screen styled as a Win95 "loading…" dialog: Dolly in a bevelled
// window whose chunky progress bar fills block by block, then the whole
// overlay fades away to reveal the chat underneath.
export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [filled, setFilled] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setInterval(() => setFilled((n) => Math.min(n + 1, SEGMENTS)), SEGMENT_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (filled < SEGMENTS) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      delay: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => finished && onFinish());
  }, [filled, opacity, onFinish]);

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Panel style={styles.window}>
        <View style={styles.titleBar}>
          <LinearGradient
            colors={headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <PixelButterfly />
          <Text style={styles.title}>Dolly Pocket</Text>
          <View style={styles.hearts}>
            <PixelHeart />
            <PixelHeart />
            <PixelHeart />
          </View>
        </View>

        <View style={styles.body}>
          <DollyDoll size={140} />
          <Text style={styles.caption}>Teasin' my hair, sugar…</Text>
          <Panel variant="sunken" style={styles.progressTrack}>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <View key={i} style={[styles.segment, i < filled && styles.segmentFilled]} />
            ))}
          </Panel>
        </View>
      </Panel>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  window: {
    width: '100%',
    maxWidth: 320,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: blockFont,
    color: colors.textPrimary,
  },
  hearts: {
    flexDirection: 'row',
    gap: 2,
  },
  body: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  caption: {
    fontFamily: blockFont,
    fontSize: 14,
    color: colors.textPrimary,
  },
  progressTrack: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 2,
    padding: 2,
    height: 22,
    backgroundColor: colors.inputBg,
  },
  segment: {
    flex: 1,
  },
  segmentFilled: {
    backgroundColor: colors.accent,
  },
});
