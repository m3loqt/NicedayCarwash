import { Text, View } from 'react-native';

interface SparklineProps {
  /** Oldest -> newest. The last value is treated as the current period and accented. */
  values: number[];
  /** One label per value, same order - e.g. day-of-week letters, month abbreviations. */
  labels?: string[];
  height?: number;
}

// Plain-View bars, no chart library (so there's no tap/tooltip support to hook into - a real
// chart lib would be a separate call). The single accented bar (the current period) is the only
// place brand yellow appears on the Overview screen.
export default function Sparkline({ values, labels, height = 44 }: SparklineProps) {
  const max = Math.max(...values, 0);

  if (max <= 0) {
    return <Text style={{ fontSize: 12, color: '#B0B0B0' }}>No sales in this period yet</Text>;
  }

  return (
    <View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {values.map((v, i) => {
          const isCurrent = i === values.length - 1;
          const isZero = v <= 0;
          const h = isZero ? 4 : Math.max(6, (v / max) * height);
          // Current bar stays yellow even at zero (so "today"/"this period" is always spottable);
          // the light-gray zero stub only applies to other, non-current empty buckets.
          const color = isCurrent ? '#F9EF08' : isZero ? '#F0F0F0' : '#E5E7EB';
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: color,
              }}
            />
          );
        })}
      </View>
      {!!labels && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          {labels.map((label, i) => (
            <Text
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 10,
                fontWeight: i === labels.length - 1 ? '700' : '500',
                color: i === labels.length - 1 ? '#1A1A1A' : '#9CA3AF',
              }}
            >
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
