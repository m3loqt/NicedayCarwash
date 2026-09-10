import { Text, View } from 'react-native';

interface SparklineProps {
  /** Oldest -> newest. The last value is treated as the current period and accented. */
  values: number[];
  height?: number;
}

// Plain-View bars, no chart library. The single accented bar (the current period) is the only
// place brand yellow appears on the Overview screen.
export default function Sparkline({ values, height = 44 }: SparklineProps) {
  const max = Math.max(...values, 0);

  if (max <= 0) {
    return <Text style={{ fontSize: 12, color: '#B0B0B0' }}>No sales in this period yet</Text>;
  }

  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
      {values.map((v, i) => {
        const isCurrent = i === values.length - 1;
        const h = Math.max(3, (v / max) * height);
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: h,
              borderRadius: 3,
              backgroundColor: isCurrent ? '#F9EF08' : '#E9E9E9',
            }}
          />
        );
      })}
    </View>
  );
}
