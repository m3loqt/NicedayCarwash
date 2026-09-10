import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

const INK = '#1A1A00';
const INK_MUTED = 'rgba(26,26,0,0.6)';
const GOOD = '#1D8A55';
const BAD = '#C23B3B';

interface TotalSalesCardProps {
  /** e.g. "today" / "this week" / "this month" */
  currentLabel: string;
  currentValueLabel: string;
  /** e.g. "Yesterday" / "Prior week" / "Last month" */
  previousLabel: string;
  previousValueLabel: string;
  /** Signed percent vs the previous period. */
  delta: number | null;
}

// Grab-Merchant-style hero sales card: brand yellow instead of their green, taller than their
// reference (per request), and adds a %-delta chip alongside the raw comparison figure - a
// percentage reads faster than making a supervisor subtract two peso amounts themselves.
//
// The flat fill read as too plain, so depth comes from a same-hue gradient, a watermark icon,
// and a soft colored shadow lifting it off the page - no new colors added to the palette.
export default function TotalSalesCard({
  currentLabel,
  currentValueLabel,
  previousLabel,
  previousValueLabel,
  delta,
}: TotalSalesCardProps) {
  const isUp = delta !== null && delta > 0;
  const isDown = delta !== null && delta < 0;
  const deltaColor = isUp ? GOOD : isDown ? BAD : INK_MUTED;

  return (
    <View
      style={{
        borderRadius: 24,
        shadowColor: '#D6C700',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <View style={{ borderRadius: 24, minHeight: 176, overflow: 'hidden' }}>
        <LinearGradient
          colors={['#FFF9B8', '#F9EF08', '#EDE100']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Oversized watermark - purely decorative, kept low-opacity so it never fights the text */}
        <Ionicons
          name="wallet"
          size={150}
          color="rgba(26,26,0,0.07)"
          style={{ position: 'absolute', right: -34, bottom: -30, transform: [{ rotate: '-12deg' }] }}
        />
        <View
          style={{
            position: 'absolute',
            top: -46,
            left: -46,
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: 'rgba(255,255,255,0.16)',
          }}
        />

        <View style={{ padding: 20, minHeight: 176, justifyContent: 'space-between' }}>
          {/* Prior-period reference */}
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 11, color: INK_MUTED, fontWeight: '600' }}>{previousLabel}</Text>
            <Text style={{ fontSize: 13, color: INK, fontWeight: '700', marginTop: 2 }}>{previousValueLabel}</Text>
          </View>

          {/* Headline total + delta */}
          <View>
            <Text style={{ fontSize: 12, color: INK_MUTED, fontWeight: '600', marginBottom: 4 }}>
              Total revenue {currentLabel}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 34, fontWeight: '800', color: INK }} numberOfLines={1}>
                {currentValueLabel}
              </Text>
              {delta !== null && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.55)',
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginLeft: 10,
                  }}
                >
                  <Ionicons name={isUp ? 'trending-up' : isDown ? 'trending-down' : 'remove'} size={12} color={deltaColor} />
                  <Text style={{ fontSize: 12, fontWeight: '700', marginLeft: 3, color: deltaColor }}>
                    {isUp ? '+' : ''}
                    {delta}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
