import { View } from 'react-native';

// Tiny 8-bit sprites drawn as grids of solid squares (rather than images or
// vector icons) so every pixel stays perfectly crisp at any size on every
// platform, and every sprite shares one style: black outline, flat fills, and
// a little white glint. In each grid, one character = one pixel; '.' is empty.

type Palette = Record<string, string>;

function PixelSprite({ rows, palette, pixel }: { rows: string[]; palette: Palette; pixel: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {rows.map((row, y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {[...row].map((cell, x) => (
            <View
              key={x}
              style={{ width: pixel, height: pixel, backgroundColor: palette[cell] ?? 'transparent' }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// O = black outline, R = red fill, W = white glint
const HEART = [
  '..OOO.OOO..',
  '.ORRRORRRO.',
  'ORWWRRRRRRO',
  'ORWRRRRRRRO',
  'ORRRRRRRRRO',
  '.ORRRRRRRO.',
  '..ORRRRRO..',
  '...ORRRO...',
  '....ORO....',
  '.....O.....',
];
const HEART_PALETTE: Palette = { O: '#000000', R: '#e8172b', W: '#ffffff' };

// O = black outline/body, A = upper wings, C = lower wings, B = white glint
const BUTTERFLY = [
  '....O...O....',
  '.....O.O.....',
  '.OOOO.O.OOOO.',
  'OAAAAOOOAAAAO',
  'OABBAOOOABBAO',
  'OAAAAOOOAAAAO',
  '.OAAAOOOAAAO.',
  '..OOOOOOOOO..',
  '.OCCCOOOCCCO.',
  '.OCCCOOOCCCO.',
  '..OOO.O.OOO..',
];
const BUTTERFLY_PALETTE: Palette = {
  O: '#000000',
  A: '#ff6ec7',
  C: '#3aa8ff',
  B: '#ffffff',
};

// Row counts, so callers can work out a sprite's rendered height.
export const HEART_ROWS = HEART.length;
export const BUTTERFLY_ROWS = BUTTERFLY.length;

export const DEFAULT_PIXEL = 2;

// The butterfly's top two rows are just thin antennae, so its visible mass
// (wings + body) sits below the middle of its box. Centering the box alone
// therefore makes it look too low next to text.
export const BUTTERFLY_ANTENNA_ROWS = 2;

// Rows that centre their children vertically leave a sprite a few pixels below
// the letters next to it. To sit a sprite's bottom edge on the text baseline
// instead: in a centered line box the baseline is (ascent - descent) / 2 below
// centre — ~0.2665em for Courier New and its metric twin Liberation Mono
// (ascent .833, descent .300) — while a sprite's bottom is half its height
// below centre. The difference is how far to lift the sprite (apply it as
// translateY: -lift). Another font would need its own metrics.
const BASELINE_BELOW_CENTER_EM = 0.2665;
export function baselineLift(rows: number, fontSize: number, pixel = DEFAULT_PIXEL): number {
  return (rows * pixel) / 2 - BASELINE_BELOW_CENTER_EM * fontSize;
}

export function PixelHeart({ pixel = DEFAULT_PIXEL }: { pixel?: number }) {
  return <PixelSprite rows={HEART} palette={HEART_PALETTE} pixel={pixel} />;
}

export function PixelButterfly({ pixel = DEFAULT_PIXEL }: { pixel?: number }) {
  return <PixelSprite rows={BUTTERFLY} palette={BUTTERFLY_PALETTE} pixel={pixel} />;
}
