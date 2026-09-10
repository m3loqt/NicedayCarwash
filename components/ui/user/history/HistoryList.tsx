import PullToRefresh from '@/components/ui/common/PullToRefresh';
import { ListSkeleton } from '@/components/ui/user/UserScreenSkeleton';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import BookingCard from './BookingCard';
import AppointmentDetailsModal from './modals/AppointmentDetailsModal';

interface Booking {
  id: string;
  branchName: string;
  address: string;
  branchId?: string;
  note: string;
  appointmentId: string;
  appointmentDate: string;
  paymentMethod: string;
  time: string;
  amount: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  isPaid?: boolean;
  vehicleName?: string;
  plateNumber?: string;
  classification?: string;
  addOns?: Array<{ name?: string; price?: number | string; estimatedTime?: string | number }>;
  services?: Array<{ name?: string; price?: number | string; estimatedTime?: string | number; status?: string }>;
  estCompletion?: string | number;
  cancelledAt?: string;
  completedAt?: string;
}

interface HistoryListProps {
  activeTab: string;
}

// Parses appointment date (MM-DD-YYYY) and time into a Date object.
// Handles: "8:00 AM", "11:00 PM", "8:00", "08:00", "8" (hour only), or empty string.
const parseAppointmentDateTime = (appointmentDate: string, time: string): Date => {
  try {
    const [month, day, year] = (appointmentDate || '').split('-').map(Number);
    if (!month || !day || !year) return new Date();

    let hours = 0;
    let minutes = 0;

    if (time) {
      const ampmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (ampmMatch) {
        hours = parseInt(ampmMatch[1], 10);
        minutes = parseInt(ampmMatch[2], 10);
        const meridiem = ampmMatch[3].toUpperCase();
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        else if (meridiem === 'AM' && hours === 12) hours = 0;
      } else {
        const colonMatch = time.match(/(\d{1,2}):(\d{2})/);
        if (colonMatch) {
          hours = parseInt(colonMatch[1], 10);
          minutes = parseInt(colonMatch[2], 10);
        } else {
          const numMatch = time.match(/^(\d{1,2})$/);
          if (numMatch) hours = parseInt(numMatch[1], 10);
        }
      }
    }

    return new Date(year, month - 1, day, hours, minutes);
  } catch {
    return new Date();
  }
};

const GROUPS: Record<string, { status: Booking['status']; label: string }[]> = {
  ongoing: [
    { status: 'pending', label: 'Awaiting Confirmation' },
    { status: 'accepted', label: 'Confirmed' },
    { status: 'ongoing', label: 'In Progress' },
  ],
  history: [
    { status: 'completed', label: 'Completed' },
    { status: 'cancelled', label: 'Cancelled' },
  ],
};

export default function HistoryList({ activeTab }: HistoryListProps) {
  const tabBarClearance = useTabBarClearance();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  // Bumped by pull-to-refresh to force the listener below to unsubscribe/resubscribe, which
  // delivers a fresh snapshot immediately (onValue always fires on subscribe, not just on change).
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const userBookingsRef = ref(db, `Reservations/ReservationsByUser/${userId}`);

    const unsubscribe = onValue(userBookingsRef, (snapshot) => {
      const list: Booking[] = [];

      snapshot.forEach((dateSnap) => {
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (data) {
            const addOnsObj = data.addOns;
            let addOns: any[] = [];
            if (Array.isArray(addOnsObj)) {
              addOns = addOnsObj;
            } else if (addOnsObj && typeof addOnsObj === 'object') {
              addOns = Object.keys(addOnsObj).map((k) => addOnsObj[k]);
            }

            const servicesObj = data.services;
            let services: any[] = [];
            if (Array.isArray(servicesObj)) {
              services = servicesObj;
            } else if (servicesObj && typeof servicesObj === 'object') {
              services = Object.keys(servicesObj).map((k) => servicesObj[k]);
            }

            const estCompletion = data.timeSlot?.estCompletion ?? null;
            const appointmentId = bookingSnap.key || '';

            list.push({
              id: appointmentId,
              branchName: data.branchName || '',
              address: data.branchAddress || '',
              branchId: data.branchId,
              appointmentId,
              paymentMethod: data.paymentMethod || '',
              time: data.timeSlot?.time || '',
              appointmentDate: data.timeSlot?.appointmentDate || '',
              amount: data.amountDue || '',
              status: data.status,
              isPaid: data.isPaid !== undefined ? data.isPaid : false,
              vehicleName: data.vehicleDetails?.vehicleName || '',
              plateNumber: data.vehicleDetails?.plateNumber || '',
              classification: data.vehicleDetails?.classification || '',
              addOns,
              note: data.note || '',
              services,
              estCompletion,
              cancelledAt: data.cancelledAt,
              completedAt: data.completedAt,
            });
          }
        });
      });

      list.sort((a, b) => {
        const dateA = parseAppointmentDateTime(a.appointmentDate, a.time);
        const dateB = parseAppointmentDateTime(b.appointmentDate, b.time);
        return dateB.getTime() - dateA.getTime();
      });

      setBookings(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshKey]);

  // One-time lookup of each branch's current photo, keyed by branchId - a booking only stores
  // branchName/branchAddress as a snapshot at booking time, not the branch's live photo.
  const [branchImages, setBranchImages] = useState<Record<string, string>>({});
  useEffect(() => {
    const db = getDatabase();
    get(ref(db, 'Branches')).then((snapshot) => {
      const images: Record<string, string> = {};
      snapshot.forEach((child) => {
        const imageUrl = child.child('profile/imageUrl').val();
        if (typeof imageUrl === 'string') images[child.key!] = imageUrl;
      });
      setBranchImages(images);
    });
  }, []);

  const handleBookingPress = (booking: Booking) => {
    if (booking.status === 'accepted' || booking.status === 'ongoing' || booking.status === 'completed') {
      router.push({
        pathname: '/user/booking-progress' as any,
        params: { appointmentId: booking.appointmentId, date: booking.appointmentDate },
      });
    } else {
      setSelectedBooking(booking);
      setShowDetails(true);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#FAFAFA]">
        <ListSkeleton rowCount={5} />
      </View>
    );
  }

  const sections = (GROUPS[activeTab] ?? [])
    .map((group) => ({
      label: group.label,
      items: bookings.filter((b) => b.status === group.status),
    }))
    .filter((section) => section.items.length > 0);

  const isEmpty = sections.length === 0;
  const hasAnyBookings = bookings.length > 0;

  // "Book your first wash" only fits a user who has never booked at all - a returning user
  // just looking at an empty Ongoing or History tab gets copy that matches what's actually
  // true for them.
  const emptyState = !hasAnyBookings
    ? {
        title: 'No bookings yet',
        subtitle: "Book your first wash and we'll keep you updated right here.",
        showCta: true,
      }
    : activeTab === 'ongoing'
      ? {
          title: 'No ongoing bookings',
          subtitle: "You don't have any active washes right now. Ready for another?",
          showCta: true,
        }
      : {
          title: 'No booking history yet',
          subtitle: 'Completed and cancelled bookings will show up here.',
          showCta: false,
        };

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <PullToRefresh
        onRefresh={() => setRefreshKey((k) => k + 1)}
        showsVerticalScrollIndicator={false}
        bounces
        className="pt-2"
        contentContainerStyle={isEmpty ? { flexGrow: 1, paddingBottom: tabBarClearance } : { paddingBottom: tabBarClearance }}
      >
        {isEmpty ? (
          <View className="flex-1 justify-center items-center px-10">
            <Ionicons name="receipt-outline" size={48} color="#E0E0E0" />
            <Text className="text-[19px] font-bold text-[#1A1A1A] mt-4 mb-1.5">{emptyState.title}</Text>
            <Text
              className="text-[13.5px] text-[#999] text-center leading-5 mb-6"
              style={{ maxWidth: 220 }}
            >
              {emptyState.subtitle}
            </Text>
            {emptyState.showCta && (
              <TouchableOpacity
                className="bg-[#F9EF08] rounded-full px-8 py-3.5"
                onPress={() => router.push('/user/(tabs)/book')}
                activeOpacity={0.85}
              >
                <Text className="text-[14px] font-bold text-[#1A1A00]">Book a Wash</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.label} className="mb-2">
              <Text className="px-5 pt-3 pb-2 text-[12px] font-bold text-[#999] uppercase tracking-wide">
                {section.label}
              </Text>
              {section.items.map((booking) => (
                <BookingCard
                  key={booking.id}
                  id={booking.id}
                  branchName={booking.branchName}
                  address={booking.address}
                  imageUrl={booking.branchId ? branchImages[booking.branchId] : undefined}
                  appointmentId={booking.appointmentId}
                  appointmentDate={booking.appointmentDate}
                  amount={booking.amount}
                  status={booking.status}
                  isPaid={booking.isPaid}
                  vehicleName={booking.vehicleName}
                  plateNumber={booking.plateNumber}
                  classification={booking.classification}
                  cancelledAt={booking.cancelledAt}
                  completedAt={booking.completedAt}
                  onPress={() => handleBookingPress(booking)}
                  onViewMore={() => handleBookingPress(booking)}
                />
              ))}
            </View>
          ))
        )}
      </PullToRefresh>

      {/* Fades list content into the floating tab bar instead of cutting it off abruptly */}
      {!isEmpty && (
        <LinearGradient
          colors={['rgba(250,250,250,0)', 'rgba(250,250,250,0.85)', '#FAFAFA']}
          locations={[0, 0.5, 1]}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 }}
        />
      )}

      {selectedBooking && (
        <AppointmentDetailsModal
          visible={showDetails}
          branchName={selectedBooking.branchName}
          branchAddress={selectedBooking.address}
          branchImage={
            selectedBooking.branchId && branchImages[selectedBooking.branchId]
              ? { uri: branchImages[selectedBooking.branchId] }
              : require('../../../../assets/images/samplebranch.png')
          }
          appointmentId={selectedBooking.appointmentId}
          status={selectedBooking.status}
          vehicleName={selectedBooking.vehicleName}
          plateNumber={selectedBooking.plateNumber}
          classification={selectedBooking.classification}
          date={selectedBooking.appointmentDate}
          time={selectedBooking.time}
          orderSummary={[
            ...(selectedBooking.services?.map((s) => ({
              label: (s?.name ?? 'Service') as string,
              price: `₱${s?.price ?? '0'}`,
            })) ?? []),
            ...(selectedBooking.addOns?.map((a) => ({
              label: (a?.name ?? 'Add-on') as string,
              price: `₱${a?.price ?? '0'}`,
            })) ?? []),
            { label: 'Booking Fee', price: '₱25' },
          ]}
          amountDue={selectedBooking.amount}
          paymentMethod={selectedBooking.paymentMethod}
          estimatedCompletion={
            selectedBooking.estCompletion != null
              ? String(selectedBooking.estCompletion)
              : undefined
          }
          note={selectedBooking.note}
          onClose={() => {
            setShowDetails(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </View>
  );
}
