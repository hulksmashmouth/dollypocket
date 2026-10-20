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

// Chromium only shows a cursor bigger than 32x32 while it fits entirely inside
// the window; near an edge it skips to the next cursor in the list. So each
// big cursor is followed by a copy shrunk to fit 32px, which keeps the heart
// (rather than the stock pointing finger) on buttons near the screen edges.
const MAX_SMALL_CURSOR = 32;

type Layer = { rows: string[]; x: number; y: number };

/**
 * Paints sprites onto one grid (later ones on top) and returns it as an SVG
 * data URI, scaled down if needed so neither side exceeds `maxSize` pixels.
 */
function spriteCursor(layers: Layer[], maxSize = Infinity): string {
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
  const fit = Math.min(1, maxSize / (Math.max(width, height) * SCALE));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.floor(width * SCALE * fit)}" ` +
    `height="${Math.floor(height * SCALE * fit)}" viewBox="0 0 ${width * SCALE} ${height * SCALE}" ` +
    `shape-rendering="crispEdges">${rects.join('')}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function injectWebCursorStyles(): void {
  if (Platform.OS !== 'web') return;

  // Big version first, then the 32px fallback. Hotspot = the arrow's tip pixel.
  const cursor = (layers: Layer[]) =>
    `url("${spriteCursor(layers)}") ${SCALE} ${SCALE}, ` +
    `url("${spriteCursor(layers, MAX_SMALL_CURSOR)}") 1 1`;
  const arrow = cursor([{ rows: ARROW, x: 0, y: 0 }]);
  const heartArrow = cursor([
    { rows: ARROW, x: 0, y: 0 },
    { rows: HEART, x: 12, y: 11 },
  ]);

  // react-native-web gives every enabled Pressable tabindex="0" plus an
  // atomic `cursor: pointer` class, so key off the tabindex and use
  // !important to win over that class. Text fields keep the normal I-beam.
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      cursor: ${arrow}, auto;
    }
    [tabindex="0"], [tabindex="0"] * {
      cursor: ${heartArrow}, pointer !important;
    }
    input, textarea, [contenteditable="true"] {
      cursor: text !important;
    }
  `;
  document.head.appendChild(style);
}
