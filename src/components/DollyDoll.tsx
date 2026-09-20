import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

// A small original illustration in the spirit of the early-2000s "dollmaker"
// web-avatar mood board — tall, slender fashion-figure proportions, long
// hair, a glam outfit — not a copy of any reference image, just the same
// vibe, tailored to Dolly Parton's actual look: big platinum hair,
// rhinestone-sparkle fit, boots. Purely decorative background flourish.
export function DollyDoll({ size = 90 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 240) / 100} viewBox="0 0 100 240" pointerEvents="none">
      {/* long hair, back layer, flowing past the waist */}
      <Path
        d="M28 30 Q20 70 24 130 Q26 150 34 150 Q30 100 36 60 Z"
        fill="#f7e7b0"
      />
      <Path
        d="M72 30 Q80 70 76 130 Q74 150 66 150 Q70 100 64 60 Z"
        fill="#f7e7b0"
      />
      <Ellipse cx="50" cy="34" rx="24" ry="22" fill="#f7e7b0" />

      {/* face */}
      <Circle cx="50" cy="38" r="14" fill="#ffd9b0" />

      {/* hair front, teased bangs/crown */}
      <Path d="M27 32 Q50 8 73 32 Q73 20 50 16 Q27 20 27 32 Z" fill="#f2c94c" />

      {/* face features */}
      <Circle cx="44" cy="39" r="1.6" fill="#3a2b1a" />
      <Circle cx="56" cy="39" r="1.6" fill="#3a2b1a" />
      <Path d="M45 46 Q50 49 55 46" stroke="#c9457a" strokeWidth={1.8} fill="none" strokeLinecap="round" />

      {/* neck */}
      <Path d="M46 50 L46 58 L54 58 L54 50 Z" fill="#ffd9b0" />

      {/* torso: fitted glam top, hourglass silhouette down to the waist */}
      <Path
        d="M34 60 Q50 54 66 60 L64 96 Q50 104 36 96 Z"
        fill="#fb60ad"
      />

      {/* mini skirt flaring from the waist */}
      <Path d="M36 96 Q50 104 64 96 L72 128 Q50 136 28 128 Z" fill="#f655f6" />

      {/* sparkle accents on the outfit */}
      <Path d="M44 74 l2.5 5 l5 1 l-5 1.5 l-2.5 5 l-1.5 -5 l-5 -1.5 l5 -1 Z" fill="#ffffff" />
      <Circle cx="58" cy="112" r="1.8" fill="#ffffff" />
      <Circle cx="42" cy="118" r="1.4" fill="#ffffff" />

      {/* arms, slender, hands resting near the hips */}
      <Path
        d="M34 62 Q20 78 24 100"
        stroke="#ffd9b0"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M66 62 Q80 78 76 100"
        stroke="#ffd9b0"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />

      {/* long slender legs */}
      <Path d="M38 128 L34 210 L44 210 L46 130 Z" fill="#ffd9b0" />
      <Path d="M62 128 L66 210 L56 210 L54 130 Z" fill="#ffd9b0" />

      {/* go-go boots */}
      <Path d="M32 206 h14 v18 h-14 Z" fill="#8a2ba8" />
      <Path d="M54 206 h14 v18 h-14 Z" fill="#8a2ba8" />
    </Svg>
  );
}
