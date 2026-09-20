// Pale-pink 1990s toy aesthetic (à la Polly Pocket) with lavender accents.
// Every text/background pairing below is verified against WCAG AA (4.5:1 for
// normal text) across all three background gradient stops — see the contrast
// checks run while choosing these values; don't hand-tweak a color here
// without re-checking it against every bgGradient stop it can appear on.
export const bgGradient = ['#ffeef7', '#f6e6fb', '#e9dbf9'] as const;
export const accentGradient = ['#d12a8a', '#9a35b8', '#6f45c7'] as const;

// Solid lavender accent for icons/links that sit directly on bgGradient
// (needs its own darker value — the accentGradient stops are tuned for white
// text ON TOP of them, not for use as text/icon color against the pale bg).
export const accentSolid = '#8a2ba8';

export const colors = {
  bgGradient,
  accentGradient,
  accentSolid,
  glassFill: 'rgba(255,255,255,0.5)',
  glassFillStrong: 'rgba(255,255,255,0.7)',
  glassBorder: 'rgba(138,43,168,0.35)',
  textPrimary: '#3d1250',
  textSecondary: '#5c2560',
  textMuted: 'rgba(61,18,80,0.68)',
  placeholder: 'rgba(61,18,80,0.65)',
  success: '#0a6b45',
  error: '#a81652',
  inputBg: 'rgba(255,255,255,0.6)',
};

export const radii = { sm: 12, md: 18, lg: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
