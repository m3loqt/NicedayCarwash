import { Text, View } from 'react-native';
import Sparkline from './Sparkline';

const INK = '#1A1A1A';
const MUTED = '#8A8A8A';
const GOOD = '#1D7A4C';
const DOWN = '#C0392B';

interface TotalSalesCardProps {
  /** e.g. "this week" */
  periodNoun: string;
  /** Formatted, e.g. "₱12,480" */
  value: string;
  /** Signed percent vs the previous period, or null when there's no comparable prior period. */
  delta: number | null;
  /** Fully-formatted absolute-difference clause, e.g. "₱360 less than last week". */
  diffLabel: string;
  /** Revenue per period bucket, oldest -> newest, last = current. */
  series: number[];
  /** One label per series value, e.g. day-of-week letters, month abbreviations. */
  labels?: string[];
}

// Not a card - the revenue number sits directly on the page as the screen's one hero element.
// Depth/decoration are deliberately absent; the sparkline is the only visual flourish.
export default function TotalSalesCard({ periodNoun, value, delta, diffLabel, series, labels }: TotalSalesCardProps) {
  const isDown = delta !== null && delta < 0;
  const isUp = delta !== null && delta > 0;
  const hasActivity = series.some((v) => v > 0);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 38, fontWeight: '800', color: INK, letterSpacing: -1 }} numberOfLines={1}>
          {value}
        </Text>
        <Text style={{ fontSize: 13, color: MUTED, marginLeft: 8 }}>{periodNoun}</Text>
      </View>

      {delta !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: isDown ? DOWN : isUp ? GOOD : MUTED }}>
            {isUp ? '▲' : isDown ? '▼' : '—'} {Math.abs(delta)}%
          </Text>
          <Text style={{ fontSize: 12, color: MUTED, marginLeft: 8 }}>· {diffLabel}</Text>
        </View>
      ) : null}

      {hasActivity ? (
        <View style={{ marginTop: 16 }}>
          <Sparkline values={series} labels={labels} />
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>No sales in this period yet</Text>
      )}
    </View>
  );
}
