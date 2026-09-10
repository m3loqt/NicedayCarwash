import { bookingStatusStyle } from '@/components/ui/admin/bookingStatusStyle';
import PullToRefresh from '@/components/ui/common/PullToRefresh';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

// Maps a booking's raw status to the tab it lives under on the Bookings screen.
const STATUS_TO_TAB: Record<string, string> = {
  pending: 'pending',
  accepted: 'confirmed',
  ongoing: 'ongoing',
  completed: 'history',
  cancelled: 'history',
};

interface DayAgendaBooking {
  appointmentId: string;
  status: string;
  timeSlot: { time: string; appointmentDate: string; estCompletion?: string };
  vehicleDetails: { vehicleName: string; plateNumber: string; classification: string };
  amountDue: number;
}

interface DayAgendaProps {
  date: Date;
  isToday: boolean;
  bookings: DayAgendaBooking[];
  onRefresh: () => void | Promise<void>;
}

export default function DayAgenda({ date, bookings, onRefresh }: DayAgendaProps) {
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A' }}>
          {dateLabel}
        </Text>
        <Text style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Booking cards */}
      <PullToRefresh
        onRefresh={onRefresh}
        style={{ paddingHorizontal: 20, flex: 1 }}
        contentContainerStyle={bookings.length === 0 ? { flexGrow: 1, paddingBottom: 24 } : { paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {bookings.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
            <Ionicons name="calendar-outline" size={48} color="#E0E0E0" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginTop: 14, marginBottom: 6 }}>
              No bookings on this day
            </Text>
            <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 18, maxWidth: 220 }}>
              Bookings scheduled for this date will show up here.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const s = bookingStatusStyle(booking.status);
            const tab = STATUS_TO_TAB[booking.status] ?? 'pending';
            return (
              <TouchableOpacity
                key={booking.appointmentId}
                activeOpacity={0.7}
                onPress={() => router.push(`/admin/bookings?tab=${tab}` as any)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                }}
              >
                {/* Vehicle name + status */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text
                    style={{ flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginRight: 8 }}
                    numberOfLines={1}
                  >
                    {booking.vehicleDetails?.vehicleName || 'Vehicle'}
                  </Text>
                  <View style={{ backgroundColor: s.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: s.fg }}>
                      {s.label}
                    </Text>
                  </View>
                </View>

                {/* Plate · Type */}
                <Text style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                  {booking.vehicleDetails?.plateNumber}
                  {booking.vehicleDetails?.plateNumber && booking.vehicleDetails?.classification ? '  ·  ' : ''}
                  {booking.vehicleDetails?.classification}
                </Text>

                {/* Time + Amount */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={13} color="#BDBDBD" />
                    <Text style={{ fontSize: 12, color: '#BDBDBD', marginLeft: 4 }}>
                      {booking.timeSlot?.time}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>
                    ₱{Number(booking.amountDue).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </PullToRefresh>
    </View>
  );
}
