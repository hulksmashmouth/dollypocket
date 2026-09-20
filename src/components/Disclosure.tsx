import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bevel, blockFont, colors, spacing } from '../theme';

interface Props {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

// Progressive disclosure: a raised-bevel header bar with a boxy [+]/[-]
// toggle that reveals/hides its content — the retro-UI equivalent of a
// details/summary element.
export function Disclosure({ title, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View>
      <Pressable
        style={styles.header}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.title}>{title}</Text>
        <View style={styles.toggleBox}>
          <Text style={styles.toggleGlyph}>{open ? '−' : '+'}</Text>
        </View>
      </Pressable>
      {open && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.panelBg,
    borderWidth: bevel.width,
    ...bevel.raised,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 20,
  },
  title: {
    fontFamily: blockFont,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  toggleBox: {
    width: 22,
    height: 22,
    backgroundColor: colors.inputBg,
    borderWidth: bevel.width,
    ...bevel.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleGlyph: {
    fontFamily: blockFont,
    fontWeight: '900',
    fontSize: 16,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  content: {
    borderWidth: bevel.width,
    borderTopWidth: 0,
    ...bevel.sunken,
    borderTopColor: 'transparent',
    backgroundColor: colors.inputBg,
    padding: spacing.md,
  },
});
