import { Image } from 'react-native';

const SOURCE = require('../../assets/dolly-doll.png');
const ASPECT_RATIO = 1536 / 1024; // native pixel size of assets/dolly-doll.png

// Decorative background flourish — Dolly Parton rendered in the early-2000s
// "dollz" web-avatar style, big teased hair and all.
export function DollyDoll({ size = 90 }: { size?: number }) {
  return (
    <Image
      source={SOURCE}
      style={{ width: size, height: size * ASPECT_RATIO }}
      resizeMode="contain"
    />
  );
}
