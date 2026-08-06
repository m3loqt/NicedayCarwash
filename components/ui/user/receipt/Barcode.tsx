import Svg, { Rect } from 'react-native-svg';

// Deterministic pseudo-random bar pattern seeded from the transaction/appointment ID.
// Purely decorative (matches the e-receipt reference visual) - nothing in the app scans it,
// so it isn't encoded as a real, scannable Code128/EAN barcode.
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) >>> 0;
    return (hash >>> 8) / 0xffffff;
  };
}

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
}

export default function Barcode({ value, width = 280, height = 70 }: BarcodeProps) {
  const random = seededRandom(value || 'NICEDAY');
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  while (x < width) {
    const w = random() > 0.65 ? 3 : 1.5;
    bars.push({ x, w });
    x += w + (random() > 0.5 ? 2 : 1);
  }

  return (
    <Svg width={width} height={height}>
      {bars.map((bar, i) => (
        <Rect key={i} x={bar.x} y={0} width={bar.w} height={height} fill="#1A1A1A" />
      ))}
    </Svg>
  );
}
