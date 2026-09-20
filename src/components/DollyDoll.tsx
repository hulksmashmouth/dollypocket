import Svg, { Circle, Ellipse, Path, Polygon } from 'react-native-svg';

// A small original illustration in the spirit of the Y2K "dollmaker" mood
// board — chunky/blocky shapes, big blonde bouffant hair (a Dolly Parton
// signature), pink sparkly dress — not a copy of any reference image, just
// the same vibe. Purely decorative background flourish.
export function DollyDoll({ size = 140 }: { size?: number }) {
  return (
    <Svg width={size} height={(size * 200) / 120} viewBox="0 0 120 200" pointerEvents="none">
      {/* big bouffant hair, back layer */}
      <Ellipse cx="60" cy="52" rx="46" ry="42" fill="#f6d861" />
      <Ellipse cx="30" cy="70" rx="16" ry="22" fill="#f6d861" />
      <Ellipse cx="90" cy="70" rx="16" ry="22" fill="#f6d861" />

      {/* face */}
      <Circle cx="60" cy="58" r="24" fill="#ffd9b0" />

      {/* hair, front bangs over forehead */}
      <Path d="M32 48 Q60 20 88 48 Q88 34 60 30 Q32 34 32 48 Z" fill="#f2c94c" />

      {/* eyes + blush + smile */}
      <Circle cx="51" cy="58" r="2.5" fill="#3a2b1a" />
      <Circle cx="69" cy="58" r="2.5" fill="#3a2b1a" />
      <Circle cx="46" cy="66" r="4" fill="#ff9ec7" opacity={0.6} />
      <Circle cx="74" cy="66" r="4" fill="#ff9ec7" opacity={0.6} />
      <Path d="M52 70 Q60 76 68 70" stroke="#b5473a" strokeWidth={2} fill="none" strokeLinecap="round" />

      {/* dress */}
      <Polygon points="40,86 80,86 96,180 24,180" fill="#fb60ad" />
      <Polygon points="40,86 80,86 88,110 32,110" fill="#f655f6" />

      {/* dress sparkles */}
      <Path d="M45 130 l3 6 l6 1 l-6 2 l-3 6 l-2 -6 l-6 -2 l6 -1 Z" fill="#ffffff" />
      <Path d="M75 150 l2 4 l4 1 l-4 1 l-2 4 l-2 -4 l-4 -1 l4 -1 Z" fill="#ffffff" />
      <Circle cx="60" cy="140" r="2" fill="#ffffff" />

      {/* arms */}
      <Path d="M40 92 Q22 100 20 124" stroke="#ffd9b0" strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path d="M80 92 Q98 100 100 124" stroke="#ffd9b0" strokeWidth={8} fill="none" strokeLinecap="round" />

      {/* boots */}
      <Path d="M32 178 h16 v14 h-16 Z" fill="#8a2ba8" />
      <Path d="M72 178 h16 v14 h-16 Z" fill="#8a2ba8" />
    </Svg>
  );
}
