import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

const INK = '#1A1A1A';
const MUTED = '#999999';
const GOOD = '#1D8A55';
const BAD = '#C23B3B';

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** Signed percent (or point) delta vs the previous period. Omit when there's no comparable prior period. */
  delta?: number | null;
  deltaSuffix?: string;
  /** Whether an increase in this metric is good for the business (controls delta color). */
  upIsGood?: boolean;
}

// Deliberately quieter than TotalSalesCard - same layered-gradient-plus-watermark technique for
// depth, but in the app's neutral greys instead of brand yellow, and no sparkline, so these read
// as supporting context rather than competing with the hero card for attention.
export default function StatTile({ icon, label, value, delta, deltaSuffix = '%', upIsGood = true }: StatTileProps) {
  const hasDelta = delta !== null && delta !== undefined;
  const isUp = hasDelta && (delta as number) > 0;
  const isFlat = hasDelta && delta === 0;
  const isGood = hasDelta && (isUp ? upIsGood : !upIsGood);
  const deltaColor = isFlat ? MUTED : isGood ? GOOD : BAD;
  // Ionicons pairs "x-outline" (used for the small chip) with a filled "x" watermark variant.
  const watermarkIcon = (icon.endsWith('-outline') ? icon.slice(0, -8) : icon) as typeof icon;

  return (
    <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
      <Ionicons
        name={watermarkIcon}
        size={62}
        color="rgba(210,197,10,0.4)"
        style={{ position: 'absolute', right: -12, bottom: -12, transform: [{ rotate: '-8deg' }] }}
      />

      <View style={{ padding: 14 }}>
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 9,
            backgroundColor: 'rgba(0,0,0,0.05)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <Ionicons name={icon} size={13} color="#7A7A7A" />
        </View>

        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }} numberOfLines={1}>
          {label}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: INK }} numberOfLines={1}>
          {value}
        </Text>

        <View style={{ marginTop: 6, height: 14 }}>
          {hasDelta ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={isFlat ? 'remove' : isUp ? 'arrow-up' : 'arrow-down'} size={11} color={deltaColor} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: deltaColor, marginLeft: 2 }} numberOfLines={1}>
                {Math.abs(delta as number)}
                {deltaSuffix}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 10, color: '#C4C4C4' }} numberOfLines={1}>
              No data yet
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
