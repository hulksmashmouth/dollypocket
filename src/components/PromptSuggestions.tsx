import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bevel, blockFont, colors, spacing } from '../theme';

export interface Suggestion {
  text: string;
  // Only worth offering when Spotify is connected ("Play Jolene" does nothing
  // useful otherwise).
  needsSpotify?: boolean;
}

// Dolly-flavored conversation starters. Each is sent as-is when tapped, so the
// wording is written as something a person would actually type to the chat.
export const SUGGESTION_POOL: Suggestion[] = [
  { text: 'Tell me about Jolene' },
  { text: 'The story behind 9 to 5' },
  { text: 'Coat of Many Colors story' },
  { text: 'Who wrote I Will Always Love You?' },
  { text: "What's Dollywood like?" },
  { text: "What's the Imagination Library?" },
  { text: 'How did Dolly get started?' },
  { text: 'Give me a Dolly fun fact' },
  { text: 'Why the big hair, sugar?' },
  { text: 'Pick a Dolly song for me' },
  { text: 'Play Jolene', needsSpotify: true },
  { text: 'Play some Dolly', needsSpotify: true },
];

export function shuffledPool(): Suggestion[] {
  const copy = [...SUGGESTION_POOL];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface Props {
  prompts: string[];
  disabled?: boolean;
  onSelect: (text: string) => void;
}

// Row of tappable Win95-style buttons above the message box.
export function PromptSuggestions({ prompts, disabled, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {prompts.map((prompt) => (
        <Pressable
          key={prompt}
          style={styles.chip}
          onPress={() => onSelect(prompt)}
          disabled={disabled}
          accessibilityRole="button"
        >
          <Text style={styles.chipText}>{prompt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    backgroundColor: colors.panelBg,
    borderWidth: bevel.width,
    ...bevel.raised,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    fontFamily: blockFont,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
