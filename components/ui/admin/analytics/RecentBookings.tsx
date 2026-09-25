import { bookingStatusStyle } from '@/components/ui/admin/bookingStatusStyle';
import { Text, View } from 'react-native';
import type { RecentBooking } from './useBranchAnalytics';

const INK = '#1A1A1A';
const MUTED = '#8A8A8A';

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-US')}`;

// "Today, 10:00 AM" / "Yesterday, 7:00 AM" / "Sep 11, 3:00 PM" - a recent-bookings list spans
// multiple days, so a bare time alone ("10:00 AM") doesn't say which day it happened.
const formatWhen = (dateKey: string, time: string): string => {
  if (!dateKey) return time || '—';
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  const dayLabel =
    diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return time ? `${dayLabel}, ${time}` : dayLabel;
};

// The "Recent bookings" heading + "See all" live on the page, outside this card.
export default function RecentBookings({ bookings }: { bookings: RecentBooking[] }) {
  if (bookings.length === 0) {
    return (
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18 }}>
        <Text style={{ fontSize: 13, color: MUTED }}>
          No bookings yet. They&apos;ll show here as customers book your branch.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}>
      {bookings.map((b, i) => {
        const pill = bookingStatusStyle(b.status);
        return (
          <View
            key={b.appointmentId}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingVertical: 13,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: '#F4F4F4',
            }}
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: INK }} numberOfLines={1}>
                {b.vehicleName}
                {b.plateNumber ? <Text style={{ color: MUTED, fontWeight: '400' }}>{`  ${b.plateNumber}`}</Text> : null}
              </Text>
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }} numberOfLines={1}>
                {formatWhen(b.dateKey, b.time)}
              </Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: INK, marginRight: 10 }}>{peso(b.amountDue)}</Text>
            <View style={{ backgroundColor: pill.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: pill.fg }}>{pill.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
