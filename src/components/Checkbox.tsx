import { Pressable, StyleSheet, Text, View } from 'react-native';
import { bevel, blockFont, colors } from '../theme';

interface Props {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

// A boxy Windows-95-style checkbox — a sunken square well with a checkmark
// drawn in when ticked — standing in for the native Switch, which can't be
// restyled into anything that reads as "90s" (it's always a smooth pill).
export function Checkbox({ value, onValueChange, disabled }: Props) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
    >
      <View style={[styles.box, disabled && styles.boxDisabled]}>
        {value && <Text style={styles.check}>✕</Text>}
      </View>
    </Pressable>
  );
}

const BOX_SIZE = 26;

const styles = StyleSheet.create({
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    backgroundColor: colors.inputBg,
    borderWidth: bevel.width,
    ...bevel.sunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDisabled: {
    backgroundColor: colors.panelBg,
  },
  check: {
    fontFamily: blockFont,
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 20,
    color: colors.textPrimary,
  },
});
