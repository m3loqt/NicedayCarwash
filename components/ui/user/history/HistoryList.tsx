import { ListSkeleton } from '@/components/ui/user/UserScreenSkeleton';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import BookingCard from './BookingCard';
import AppointmentDetailsModal from './modals/AppointmentDetailsModal';

interface Booking {
  id: string;
  branchName: string;
  address: string;
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

      setBookings(list);
      setLoading(false);
    });

    return () => unsubscribe();
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

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        className="pt-2"
        contentContainerStyle={isEmpty ? { flexGrow: 1, paddingBottom: tabBarClearance } : { paddingBottom: tabBarClearance }}
      >
        {isEmpty ? (
          <View className="flex-1 justify-center items-center px-10">
            <Ionicons name="receipt-outline" size={48} color="#E0E0E0" />
            <Text className="text-[19px] font-bold text-[#1A1A1A] mt-4 mb-1.5">No bookings yet</Text>
            <Text
              className="text-[13.5px] text-[#999] text-center leading-5 mb-6"
              style={{ maxWidth: 220 }}
            >
              Book your first wash and we&apos;ll keep you updated right here.
            </Text>
            <TouchableOpacity
              className="bg-[#F9EF08] rounded-full px-8 py-3.5"
              onPress={() => router.push('/user/(tabs)/book')}
              activeOpacity={0.85}
            >
              <Text className="text-[14px] font-bold text-[#1A1A00]">Book a Wash</Text>
            </TouchableOpacity>
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
      </ScrollView>

      {selectedBooking && (
        <AppointmentDetailsModal
          visible={showDetails}
          branchName={selectedBooking.branchName}
          branchAddress={selectedBooking.address}
          branchImage={require('../../../../assets/images/samplebranch.png')}
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
            typeof selectedBooking.estCompletion === 'number'
              ? `${selectedBooking.estCompletion} Hours`
              : selectedBooking.estCompletion
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
