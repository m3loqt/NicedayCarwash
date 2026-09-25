import { bookingStatusStyle } from '@/components/ui/admin/bookingStatusStyle';
import { AppButton } from '@/components/ui/common/AppButton';
import { Text, View } from 'react-native';

// Splits "7:00 AM" into ["7:00", "AM"] for the card's time column; falls back to a bare
// "HH:MM" 24-hour string (no AM/PM suffix) as-is if that's what's stored.
const splitTime = (time: string | undefined): [string, string] => {
  if (!time) return ['--:--', ''];
  const match = time.trim().match(/^(.+?)\s*(AM|PM)$/i);
  if (match) return [match[1], match[2].toUpperCase()];
  return [time, ''];
};

export interface BookingCardProps {
  time?: string;
  /** Shown above the time instead of AM/PM when the list mixes dates (e.g. "Sep 12"). */
  dateLabel?: string;
  title: string;
  serviceLabel?: string;
  detailLabel?: string;
  amountDue: number;
  status: string;
  onPress?: () => void;
}

// Shared booking-card presentation, used on both the admin Calendar screen's day agenda and the
// Overview screen's Recent Bookings list, so a booking looks identical everywhere a supervisor
// sees one. Time column + divider, title/status pill, optional service line, optional detail
// line with price, status-colored pill (bookingStatusStyle - same palette as everywhere else on
// the admin side), cancelled bookings dimmed to 60%.
export default function BookingCard({
  time,
  dateLabel,
  title,
  serviceLabel,
  detailLabel,
  amountDue,
  status,
  onPress,
}: BookingCardProps) {
  const s = bookingStatusStyle(status);
  const isCancelled = status === 'cancelled';
  const [timePart, ampm] = splitTime(time);
  const price = `₱${(Number(amountDue) || 0).toFixed(2)}`;

  return (
    <AppButton
      onPress={onPress}
      style={{
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        opacity: isCancelled ? 0.6 : 1,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Time column - sized to its own content, not a fixed width */}
        <View style={{ paddingRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
            {timePart}
          </Text>
          {!!dateLabel ? (
            <Text style={{ fontSize: 11, color: '#999', marginTop: 1 }} numberOfLines={1}>
              {dateLabel}
            </Text>
          ) : !!ampm ? (
            <Text style={{ fontSize: 11, color: '#999', marginTop: 1 }}>{ampm}</Text>
          ) : null}
        </View>
        <View style={{ width: 1, backgroundColor: '#EEEEEE' }} />

        {/* Content column */}
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 }}>
            <Text
              style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginRight: 8 }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <View style={{ backgroundColor: s.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: s.fg }}>{s.label}</Text>
            </View>
          </View>

          {!!serviceLabel && (
            <Text style={{ fontSize: 12.5, color: '#1A1A1A', marginBottom: 3 }} numberOfLines={1}>
              {serviceLabel}
            </Text>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 12, color: '#999' }} numberOfLines={1}>
              {detailLabel}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginLeft: 8 }}>
              {price}
            </Text>
          </View>
        </View>
      </View>
    </AppButton>
  );
}
