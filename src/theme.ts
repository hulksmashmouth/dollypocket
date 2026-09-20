// Flat pastel-pink/pastel-purple 1990s Windows UI, Y2K-bright saturation —
// square corners everywhere, depth from a hard two-tone bevel border (light
// top/left, dark bottom/right = "raised"; reversed = "sunken"), exactly like
// classic Win95 buttons/panels/inputs. The one deliberate exception is
// window header bars, which get a gradient fill (see `headerGradient`)
// instead of a flat color — everything else stays gradient-free.
//
// Every text/background pairing here is verified against WCAG 2.1 AA
// (4.5:1 for normal text) — see the contrast checks run while choosing these
// values. Don't hand-tweak a color without re-checking it.
export const colors = {
  bg: '#f7a1d8',
  panelBg: '#f7a1d8',
  accent: '#b870eb',
  bevelLight: '#ffffff',
  bevelDark: '#2e0f3d',
  textPrimary: '#2e0f3d',
  textSecondary: '#4a2359',
  textMuted: 'rgba(46,15,61,0.75)',
  placeholder: 'rgba(46,15,61,0.6)',
  success: '#054d2e',
  error: '#7a1438',
  inputBg: '#ffffff',
};

// Window header/titlebar fill — the one gradient in the whole theme.
export const headerGradient = ['#fb60ad', '#f655f6'] as const;

// A monospace stack reads as "blocky/computer-y" cross-platform without
// needing to bundle an actual bitmap font (react-native-web passes this
// straight through as a CSS font-family; native falls back to each
// platform's built-in monospace).
export const blockFont = 'Courier New, Courier, monospace';

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

// Bevel border widths/colors shared by every raised/sunken surface.
export const bevel = {
  width: 2,
  raised: {
    borderTopColor: colors.bevelLight,
    borderLeftColor: colors.bevelLight,
    borderBottomColor: colors.bevelDark,
    borderRightColor: colors.bevelDark,
  },
  sunken: {
    borderTopColor: colors.bevelDark,
    borderLeftColor: colors.bevelDark,
    borderBottomColor: colors.bevelLight,
    borderRightColor: colors.bevelLight,
  },
} as const;
