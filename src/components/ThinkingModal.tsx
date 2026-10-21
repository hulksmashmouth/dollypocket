import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { bevel, blockFont, colors, spacing } from '../theme';
import { STAGE_WIDTH, ThinkingIndicator } from './ThinkingIndicator';

interface Props {
  visible: boolean;
  onCancel: () => void;
}

const MAX_SCALE = 2;

// Covers the whole screen while Dolly works out a reply, and goes away as
// soon as the first words start writing out. Cancel is the way out if the
// model never answers.
export function ThinkingModal({ visible, onCancel }: Props) {
  // The indicator is drawn at its bubble size and scaled up as far as the
  // screen allows. A scale transform doesn't change layout, so the extra
  // margin keeps the scaled-up stage clear of the Cancel button.
  const width = useWindowDimensions().width;
  const scale = Math.min(MAX_SCALE, (width - spacing.lg * 2) / STAGE_WIDTH);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.screen}>
        <View style={{ transform: [{ scale }], marginVertical: 70 * (scale - 1) }}>
          <ThinkingIndicator />
        </View>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
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
  cancelButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.panelBg,
    borderWidth: bevel.width,
    ...bevel.raised,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelText: {
    color: colors.textPrimary,
    fontFamily: blockFont,
    fontSize: 16,
    fontWeight: '700',
  },
});
