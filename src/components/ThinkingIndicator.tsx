import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { blockFont, colors, spacing } from '../theme';
import { PixelButterfly, PixelHeart } from './PixelArt';

// Shown full screen (ThinkingModal) before the first words of a reply arrive: a little
// pixel stage (hearts hopping in a wave, music notes floating up off them, a
// butterfly flapping back and forth overhead) above a rotating Dolly fact.

export const STAGE_WIDTH = 220;
const STAGE_HEIGHT = 64;

const HEARTS = 3;
const HEART_GAP = 30;
const HOP_HEIGHT = 8;
const HOP_MS = 260;
// Each heart starts its hop this long after the one before it — a wave.
const STAGGER_MS = 140;

const BUTTERFLY_WIDTH = 26; // 13 sprite pixels at the default 2px
const FLIGHT_MS = 2600; // one crossing of the stage
const BOB_HEIGHT = 5;
const BOB_MS = 380;
const FLAP_MS = 140;

const NOTES = ['♪', '♫', '♪'];
const NOTE_RISE = 34;
const NOTE_MS = 1500;

const FACT_MS = 5500;

// Kept to well-documented facts — she's real, so no making things up.
const FACTS = [
  'She wrote "Jolene" and "I Will Always Love You" on the same day.',
  'She\'s the fourth of 12 children, raised in a one-room cabin in the Smokies.',
  'Dolly the sheep, the first cloned mammal, was named after her.',
  'Her Imagination Library has mailed kids over 200 million free books.',
  'She tapped out the rhythm of "9 to 5" on her acrylic nails.',
  '"9 to 5" earned her an Oscar nomination for Best Original Song.',
  'Dollywood opened in Pigeon Forge, Tennessee, in 1986.',
  'She gave $1 million toward research on the Moderna COVID-19 vaccine.',
  'She tried to turn down the Rock & Roll Hall of Fame, then got inducted in 2022.',
  'She says she\'s written over 3,000 songs.',
  'She says she once entered a Dolly look-alike contest — and lost.',
];

const useNativeDriver = Platform.OS !== 'web';

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

// Runs `make()`'s animation on a loop while mounted (unless `still`), then
// resets `value` so a stopped sprite rests in its home position.
function useLoop(value: Animated.Value, still: boolean, make: () => Animated.CompositeAnimation) {
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(make());
    loop.start();
    return () => {
      loop.stop();
      value.setValue(0);
    };
  }, [still]);
}

function HoppingHeart({ index, still }: { index: number; still: boolean }) {
  const y = useRef(new Animated.Value(0)).current;
  useLoop(y, still, () =>
    Animated.sequence([
      Animated.delay(index * STAGGER_MS),
      Animated.timing(y, {
        toValue: -HOP_HEIGHT,
        duration: HOP_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver,
      }),
      Animated.timing(y, {
        toValue: 0,
        duration: HOP_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver,
      }),
      // Rest so every heart's loop is the same length and the wave stays in step.
      Animated.delay((HEARTS - 1 - index) * STAGGER_MS + 200),
    ])
  );

  return (
    <Animated.View
      style={[styles.heart, { left: index * HEART_GAP, transform: [{ translateY: y }] }]}
    >
      <PixelHeart />
    </Animated.View>
  );
}

function FloatingNote({ index, still }: { index: number; still: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useLoop(t, still, () =>
    Animated.sequence([
      Animated.delay(index * (NOTE_MS / NOTES.length)),
      Animated.timing(t, { toValue: 1, duration: NOTE_MS, easing: Easing.linear, useNativeDriver }),
      Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver }),
      Animated.delay((NOTES.length - 1 - index) * (NOTE_MS / NOTES.length)),
    ])
  );

  if (still) return null;
  return (
    <Animated.Text
      style={[
        styles.note,
        {
          left: index * HEART_GAP + 6,
          opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -NOTE_RISE] }) },
            // A little sideways sway on the way up.
            {
              translateX: t.interpolate({
                inputRange: [0, 0.33, 0.66, 1],
                outputRange: [0, 4, -4, 0],
              }),
            },
          ],
        },
      ]}
    >
      {NOTES[index]}
    </Animated.Text>
  );
}

function FlyingButterfly({ still }: { still: boolean }) {
  const x = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const [folded, setFolded] = useState(false);

  useLoop(x, still, () =>
    Animated.sequence([
      Animated.timing(x, {
        toValue: 1,
        duration: FLIGHT_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver,
      }),
      Animated.timing(x, {
        toValue: 0,
        duration: FLIGHT_MS,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver,
      }),
    ])
  );
  useLoop(bob, still, () =>
    Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: BOB_MS, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      Animated.timing(bob, { toValue: 0, duration: BOB_MS, easing: Easing.inOut(Easing.sin), useNativeDriver }),
    ])
  );

  useEffect(() => {
    if (still) return;
    const timer = setInterval(() => setFolded((f) => !f), FLAP_MS);
    return () => clearInterval(timer);
  }, [still]);

  return (
    <Animated.View
      style={[
        styles.butterfly,
        {
          transform: [
            {
              translateX: x.interpolate({
                inputRange: [0, 1],
                outputRange: [HEARTS * HEART_GAP, STAGE_WIDTH - BUTTERFLY_WIDTH],
              }),
            },
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, BOB_HEIGHT] }) },
          ],
        },
      ]}
    >
      <PixelButterfly folded={folded} />
    </Animated.View>
  );
}

export function ThinkingIndicator() {
  const still = useReduceMotion();
  const [fact, setFact] = useState(() => Math.floor(Math.random() * FACTS.length));

  useEffect(() => {
    const timer = setInterval(() => setFact((f) => (f + 1) % FACTS.length), FACT_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Dolly is thinking">
      <View
        style={styles.stage}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {NOTES.map((_, i) => (
          <FloatingNote key={i} index={i} still={still} />
        ))}
        {Array.from({ length: HEARTS }, (_, i) => (
          <HoppingHeart key={i} index={i} still={still} />
        ))}
        <FlyingButterfly still={still} />
      </View>
      <Text style={styles.factLabel}>Dolly fact!</Text>
      <Text style={styles.fact}>{FACTS[fact]}</Text>
    </View>
  );
}

const BLINK_MS = 450;

// A blinking red heart that sits at the end of the text while Dolly's still
// writing, like a typing cursor. Render it inside the message's <Text>.
export function WritingHeart() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setOn((v) => !v), BLINK_MS);
    return () => clearInterval(timer);
  }, []);

  return <Text style={[styles.writingHeart, !on && styles.hidden]}> ♥</Text>;
}

const styles = StyleSheet.create({
  stage: {
    width: STAGE_WIDTH,
    maxWidth: '100%',
    height: STAGE_HEIGHT,
  },
  heart: {
    position: 'absolute',
    bottom: 0,
  },
  note: {
    position: 'absolute',
    bottom: 16,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  butterfly: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  factLabel: {
    marginTop: spacing.sm,
    color: colors.textPrimary,
    fontFamily: blockFont,
    fontSize: 13,
    fontWeight: 'bold',
  },
  fact: {
    width: STAGE_WIDTH,
    maxWidth: '100%',
    color: colors.textSecondary,
    fontFamily: blockFont,
    fontSize: 13,
  },
  writingHeart: {
    color: '#e8172b',
  },
  hidden: {
    opacity: 0,
  },
});
