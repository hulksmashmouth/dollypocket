import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { bevel, colors } from '../theme';

interface Props extends ViewProps {
  variant?: 'raised' | 'sunken';
  style?: StyleProp<ViewStyle>;
}

// Flat pastel panel with a hard two-tone bevel border — the classic Windows
// 95 "raised" (buttons, toolbars, panels) or "sunken" (text fields) look.
// No blur, no gradient, no rounded corners.
export function Panel({ variant = 'raised', style, children, ...rest }: Props) {
  return (
    <View
      style={[styles.base, variant === 'raised' ? bevel.raised : bevel.sunken, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.panelBg,
    borderWidth: bevel.width,
  },
});
