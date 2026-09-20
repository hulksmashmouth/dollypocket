import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

// A small original illustration in the spirit of the early-2000s "dollz"
// web-avatar mood board — flat cel-shaded color blocking, a rounder face
// with a defined chin, big diagonal side-swept bangs, a hand-on-hip pose,
// fitted halter top + flared low-rise pants, platform boots — not a copy of
// any reference image, just the same genre. The one deliberate swap: Dolly
// Parton's actual signature is a huge teased bouffant, so that replaces the
// sleek hair those dolls usually have. Purely decorative background flourish.
export function DollyDoll({ size = 90 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 240) / 100} viewBox="0 0 100 240" pointerEvents="none">
      {/* big teased bouffant — oversized, rounded, built from overlapping
          lobes to read as "volume" rather than a smooth cap */}
      <Ellipse cx="50" cy="26" rx="30" ry="26" fill="#f7e7b0" />
      <Ellipse cx="26" cy="34" rx="14" ry="18" fill="#f7e7b0" />
      <Ellipse cx="74" cy="34" rx="14" ry="18" fill="#f7e7b0" />
      <Ellipse cx="50" cy="10" rx="20" ry="14" fill="#f7e7b0" />
      {/* hair falling past the shoulders, both sides */}
      <Path d="M24 40 Q18 70 24 100 Q28 104 32 100 Q26 70 32 44 Z" fill="#f7e7b0" />
      <Path d="M76 40 Q82 70 76 100 Q72 104 68 100 Q74 70 68 44 Z" fill="#f7e7b0" />

      {/* face — oval with a defined, slightly pointed chin */}
      <Path
        d="M37 30 Q37 46 50 54 Q63 46 63 30 Q63 18 50 18 Q37 18 37 30 Z"
        fill="#ffd9b0"
      />

      {/* big diagonal side-swept bangs crossing the forehead */}
      <Path d="M35 26 Q46 14 66 22 Q60 24 52 22 Q42 22 35 30 Z" fill="#f2c94c" />

      {/* face features */}
      <Path d="M41 32 Q44 30 47 32" stroke="#3a2b1a" strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <Path d="M53 32 Q56 30 59 32" stroke="#3a2b1a" strokeWidth={1.3} fill="none" strokeLinecap="round" />
      <Circle cx="40" cy="40" r="3" fill="#ff9ec7" opacity={0.5} />
      <Circle cx="60" cy="40" r="3" fill="#ff9ec7" opacity={0.5} />
      <Path d="M45 45 Q50 49 55 45" stroke="#c9457a" strokeWidth={2} fill="none" strokeLinecap="round" />

      {/* neck */}
      <Path d="M45 52 L45 60 L55 60 L55 52 Z" fill="#ffd9b0" />

      {/* fitted halter top, midriff-baring */}
      <Path d="M34 62 Q50 56 66 62 L62 92 Q50 98 38 92 Z" fill="#fb60ad" />

      {/* low-rise flared pants, waistband at the hips */}
      <Path
        d="M38 96 L62 96 L68 150 Q60 156 50 154 Q40 156 32 150 Z"
        fill="#b870eb"
      />
      {/* bell-bottom flares */}
      <Path d="M32 150 L22 205 L42 205 L44 156 Z" fill="#b870eb" />
      <Path d="M68 150 L78 205 L58 205 L56 156 Z" fill="#b870eb" />

      {/* sparkle accents */}
      <Path d="M46 74 l2 4 l4 1 l-4 1 l-2 4 l-2 -4 l-4 -1 l4 -1 Z" fill="#ffffff" />
      <Circle cx="50" cy="120" r="1.6" fill="#ffffff" />

      {/* relaxed arm at the side */}
      <Path
        d="M34 64 Q24 80 26 100"
        stroke="#ffd9b0"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      {/* other arm bent, hand on hip */}
      <Path
        d="M66 64 Q78 72 74 88 Q70 94 62 92"
        stroke="#ffd9b0"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />

      {/* platform boots */}
      <Path d="M20 200 h24 v20 h-24 Z" fill="#2e0f3d" />
      <Path d="M56 200 h24 v20 h-24 Z" fill="#2e0f3d" />
      <Path d="M20 216 h24 v6 h-24 Z" fill="#3a1750" />
      <Path d="M56 216 h24 v6 h-24 Z" fill="#3a1750" />
    </Svg>
  );
}
