import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { blockFont, colors, spacing } from '../theme';
import { Panel } from './Panel';
import { STAGE_WIDTH, ThinkingIndicator } from './ThinkingIndicator';

// What the reply is waiting on: the knowledge-base lookup, then the model's
// first words.
export type ThinkingStage = 'searching' | 'thinking';

interface Props {
  visible: boolean;
  stage: ThinkingStage;
}

const MAX_SCALE = 2;

// Same chunky Win95 bar as the splash screen.
const SEGMENTS = 12;
const TICK_MS = 250;
// Ollama reports nothing before the first word, so the bar runs on how long
// each stage usually takes on the Pi (measured: ~1-2s to search, ~30-35s
// for qwen2.5:3b to read the prompt and start answering). The thinking
// stage eases toward the end without reaching it, so a slow reply keeps
// creeping rather than sitting "full" while it's still working.
const SEARCH_SHARE = 0.15;
const SEARCH_MS = 1500;
const THINK_TAU_MS = 15000;
const MAX_PROGRESS = 0.95;

function progressFor(stage: ThinkingStage, elapsedMs: number): number {
  if (stage === 'searching') return SEARCH_SHARE * Math.min(1, elapsedMs / SEARCH_MS);
  return SEARCH_SHARE + (MAX_PROGRESS - SEARCH_SHARE) * (1 - Math.exp(-elapsedMs / THINK_TAU_MS));
}

const CAPTIONS: Record<ThinkingStage, string> = {
  searching: "Lookin' that up, sugar…",
  thinking: "Thinkin' it over…",
};

// Covers the whole screen while Dolly works out a reply, and goes away as
// soon as the first words start writing out. There's no way to dismiss it:
// ChatScreen gives up on a reply that never starts, which closes it.
export function ThinkingModal({ visible, stage }: Props) {
  // The indicator is drawn at its bubble size and scaled up as far as the
  // screen allows. A scale transform doesn't change layout, so the extra
  // margin keeps the scaled-up stage clear of the progress bar.
  const width = useWindowDimensions().width;
  const scale = Math.min(MAX_SCALE, (width - spacing.lg * 2) / STAGE_WIDTH);

  const [stageStart, setStageStart] = useState(Date.now);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    setStageStart(Date.now());
    setNow(Date.now());
  }, [stage, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [visible]);

  const progress = progressFor(stage, now - stageStart);
  const filled = Math.floor(progress * SEGMENTS);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}}>
      <View style={styles.screen}>
        <View style={{ transform: [{ scale }], marginVertical: 70 * (scale - 1) }}>
          <ThinkingIndicator />
        </View>
        <View style={[styles.status, { width: STAGE_WIDTH * scale }]}>
          <Text style={styles.caption}>{CAPTIONS[stage]}</Text>
          <Panel
            variant="sunken"
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityLabel={CAPTIONS[stage]}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          >
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <View key={i} style={[styles.segment, i < filled && styles.segmentFilled]} />
            ))}
          </Panel>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  status: {
    marginTop: spacing.xl,
    maxWidth: '100%',
    gap: spacing.sm,
  },
  caption: {
    fontFamily: blockFont,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  progressTrack: {
    flexDirection: 'row',
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
