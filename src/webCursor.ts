import { Platform } from 'react-native';
import { headerGradient } from './theme';

// A big pixel-art mouse cursor in the same 8-bit style as PixelArt's sprites
// (black outline, flat fills, white glint): a hot-pink arrow, plus a little
// red heart beside it whenever the pointer is over something clickable.
// One character = one pixel; '.' is empty. Web only — native has no cursor.

// O = black outline, P = pink fill, W = white glint, R = red heart
const ARROW = [
  'O..........',
  'OO.........',
  'OPO........',
  'OWPO.......',
  'OWPPO......',
  'OWPPPO.....',
  'OPPPPPO....',
  'OPPPPPPO...',
  'OPPPPPPPO..',
  'OPPPPPPPPO.',
  'OPPPPPPPPPO',
  'OPPPPPOOOOO',
  'OPPOPPO....',
  'OPO.OPPO...',
  'OO..OPPO...',
  'O....OPPO..',
  '.....OPPO..',
  '......OO...',
];

const HEART = [
  '.OO.OO.',
  'OWRORRO',
  'ORRRRRO',
  '.ORRRO.',
  '..ORO..',
  '...O...',
];

const PALETTE: Record<string, string> = {
  O: '#000000',
  P: headerGradient[0],
  W: '#ffffff',
  R: '#e8172b',
};

// Each sprite pixel is drawn this many screen pixels wide — about 2.5x the
// size of a stock cursor, so it's easy to spot on the kiosk's small panel.
const SCALE = 3;

/** Paints sprites onto one grid (later ones on top) and returns it as an SVG data URI. */
function spriteCursor(layers: { rows: string[]; x: number; y: number }[]): string {
  const width = Math.max(...layers.map((l) => l.x + Math.max(...l.rows.map((r) => r.length))));
  const height = Math.max(...layers.map((l) => l.y + l.rows.length));
  const rects: string[] = [];
  for (const { rows, x: ox, y: oy } of layers) {
    rows.forEach((row, y) =>
      [...row].forEach((cell, x) => {
        const fill = PALETTE[cell];
        if (fill) {
          rects.push(
            `<rect x="${(ox + x) * SCALE}" y="${(oy + y) * SCALE}" width="${SCALE}" height="${SCALE}" fill="${fill}"/>`
          );
        }
      })
    );
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * SCALE}" height="${height * SCALE}" ` +
    `shape-rendering="crispEdges">${rects.join('')}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function injectWebCursorStyles(): void {
  if (Platform.OS !== 'web') return;

  const arrow = spriteCursor([{ rows: ARROW, x: 0, y: 0 }]);
  const heartArrow = spriteCursor([
    { rows: ARROW, x: 0, y: 0 },
    { rows: HEART, x: 12, y: 11 },
  ]);
  // Hotspot = the arrow's tip pixel.
  const hotspot = `${SCALE} ${SCALE}`;

  // react-native-web gives every enabled Pressable tabindex="0" plus an
  // atomic `cursor: pointer` class, so key off the tabindex and use
  // !important to win over that class. Text fields keep the normal I-beam.
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      cursor: url("${arrow}") ${hotspot}, auto;
    }
    [tabindex="0"], [tabindex="0"] * {
      cursor: url("${heartArrow}") ${hotspot}, pointer !important;
    }
    input, textarea, [contenteditable="true"] {
      cursor: text !important;
    }
  `;
  document.head.appendChild(style);
}
