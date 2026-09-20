import { Pressable, PressableProps, StyleSheet } from 'react-native';
import { bevel, colors } from '../theme';

interface Props extends PressableProps {
  size?: number;
}

// A small raised-bevel square button to hold an icon — this is what makes an
// icon read as "90s Windows toolbar chrome" rather than a smooth modern
// glyph floating on its own: the box itself carries the retro styling.
export function IconButton({ size = 36, style, children, ...rest }: Props) {
  return (
    <Pressable
      style={[styles.button, { width: size, height: size }, style as object]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.panelBg,
    borderWidth: bevel.width,
    ...bevel.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
