import { Text, View } from 'react-native';

const INK = '#1A1A1A';
const MUTED = '#8A8A8A';
const GOOD = '#1D7A4C';
const BAD = '#C0392B';

interface StatTileProps {
  label: string;
  value: string;
  /** Signed delta vs the previous period. Omit/null when there's no comparable prior period. */
  delta?: number | null;
  /** "" for a raw count, "%" (default) for a rate, "pts" for a percentage-point change. */
  deltaSuffix?: string;
  /** For metrics where an increase is the bad outcome (e.g. cancellations). */
  alarmOnRise?: boolean;
}

// White card on the grey page, matching the rest of the screen. No icon or watermark - the label
// says what the number is.
export default function StatTile({ label, value, delta, deltaSuffix = '%', alarmOnRise = false }: StatTileProps) {
  const hasDelta = delta !== null && delta !== undefined;
  const d = (delta as number) || 0;
  const rising = hasDelta && d > 0;
  const falling = hasDelta && d < 0;
  const isGoodMove = alarmOnRise ? falling : rising;
  const isBadMove = alarmOnRise ? rising : falling;
  const color = isGoodMove ? GOOD : isBadMove ? BAD : MUTED;

  return (
    <View style={{ flex: 1, borderRadius: 16, backgroundColor: '#FFFFFF', padding: 16 }}>
      {/* Fixed slots (label 2 lines, delta 1 line) so tiles in a row keep the same height whether
          or not each has a wrapping label or a comparison figure. */}
      <View style={{ height: 32 }}>
        <Text style={{ fontSize: 12, color: MUTED, lineHeight: 16 }} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 26, fontWeight: '700', color: INK, marginTop: 4 }} numberOfLines={1}>
        {value}
      </Text>
      <View style={{ height: 16, marginTop: 5 }}>
        {hasDelta ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color }} numberOfLines={1}>
            {rising ? '▲' : falling ? '▼' : '—'} {Math.abs(d)}
            {deltaSuffix} <Text style={{ color: MUTED, fontWeight: '400' }}>vs prev</Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
}
