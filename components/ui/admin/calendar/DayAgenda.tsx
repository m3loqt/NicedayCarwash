import BookingCard from '@/components/ui/admin/BookingCard';
import PullToRefresh from '@/components/ui/common/PullToRefresh';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { Image, Text, View } from 'react-native';

// Maps a booking's raw status to the tab it lives under on the Bookings screen.
const STATUS_TO_TAB: Record<string, string> = {
  pending: 'pending',
  accepted: 'confirmed',
  ongoing: 'ongoing',
  completed: 'history',
  cancelled: 'history',
};

// Maps a booking's raw status to the section it's grouped under in the day's agenda below.
// "In progress" is literally status === 'ongoing' (the wash is happening right now); pending
// and accepted are both still ahead of that, so they share "Upcoming" for a single day's view.
type AgendaGroup = 'In progress' | 'Upcoming' | 'Completed' | 'Cancelled';
const STATUS_TO_GROUP: Record<string, AgendaGroup> = {
  ongoing: 'In progress',
  pending: 'Upcoming',
  accepted: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const GROUP_ORDER: AgendaGroup[] = ['In progress', 'Upcoming', 'Completed', 'Cancelled'];

interface DayAgendaBooking {
  appointmentId: string;
  status: string;
  timeSlot: { time: string; appointmentDate: string; estCompletion?: string };
  vehicleDetails: { vehicleName: string; plateNumber: string; classification: string };
  amountDue: number;
  // TODO: no customer name is stored on the reservation record anywhere (see
  // ConfirmationStep.tsx's bookingData) - the card falls back to the vehicle name as its title
  // until one is added at booking-creation time.
  services?: { name: string }[];
}

interface DayAgendaProps {
  date: Date;
  isToday: boolean;
  bookings: DayAgendaBooking[];
  onRefresh: () => void | Promise<void>;
}

// Parses "7:00 AM" / "07:00 AM" / "19:00" into minutes-since-midnight for sorting.
const timeToMinutes = (time: string | undefined): number => {
  if (!time) return 0;
  const isPM = /pm/i.test(time);
  const isAM = /am/i.test(time);
  const [hStr, mStr] = time.replace(/[^0-9:]/g, '').split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  if (isPM && h !== 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
};

export default function DayAgenda({ date, isToday, bookings, onRefresh }: DayAgendaProps) {
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const headingLabel = isToday ? `Today, ${dateLabel}` : dateLabel;

  // Client-side summary from the day's already-loaded bookings - no new fetch.
  const nonCancelled = bookings.filter((b) => b.status !== 'cancelled');
  const inProgressCount = bookings.filter((b) => STATUS_TO_GROUP[b.status] === 'In progress').length;

  const summaryParts = [`${nonCancelled.length} booking${nonCancelled.length !== 1 ? 's' : ''}`];
  if (inProgressCount > 0) summaryParts.push(`${inProgressCount} in progress`);

  const sorted = [...bookings].sort((a, b) => timeToMinutes(a.timeSlot?.time) - timeToMinutes(b.timeSlot?.time));
  const grouped: Partial<Record<AgendaGroup, DayAgendaBooking[]>> = {};
  sorted.forEach((b) => {
    const group = STATUS_TO_GROUP[b.status] ?? 'Upcoming';
    (grouped[group] ??= []).push(b);
  });

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A' }}>
          {headingLabel}
        </Text>
        <Text style={{ fontSize: 13, color: '#999', marginTop: 3 }}>
          {summaryParts.map((part, i) => (
            <Fragment key={i}>
              {i > 0 && <Text style={{ color: '#CCC' }}> · </Text>}
              {part}
            </Fragment>
          ))}
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
            <Image
              source={require('../../../../assets/images/empty.png')}
              style={{ width: 160, height: 160 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginTop: 14, marginBottom: 6 }}>
              No bookings on this day
            </Text>
            <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 18, maxWidth: 260 }}>
              Bookings for this date will show up here.
            </Text>
          </View>
        ) : (
          GROUP_ORDER.map((group) => {
            const items = grouped[group];
            if (!items || items.length === 0) return null;

            return (
              <View key={group}>
                {items.map((booking) => {
                  const tab = STATUS_TO_TAB[booking.status] ?? 'pending';
                  // No customer name is available (see the TODO on DayAgendaBooking above) - the
                  // vehicle name doubles as the title, so it's left out of the detail row below
                  // to avoid showing it twice.
                  const title = booking.vehicleDetails?.vehicleName || 'Vehicle';
                  const serviceLabel = (booking.services ?? []).map((sv) => sv?.name).filter(Boolean).join(', ');
                  const detailLabel = [booking.vehicleDetails?.plateNumber, booking.vehicleDetails?.classification]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <BookingCard
                      key={booking.appointmentId}
                      time={booking.timeSlot?.time}
                      title={title}
                      serviceLabel={serviceLabel}
                      detailLabel={detailLabel}
                      amountDue={booking.amountDue}
                      status={booking.status}
                      onPress={() => router.push(`/admin/bookings?tab=${tab}` as any)}
                    />
                  );
                })}
              </View>
            );
          })
        )}
      </PullToRefresh>
    </View>
  );
}
