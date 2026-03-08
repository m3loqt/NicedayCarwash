import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ListSkeleton } from '../../components/ui/user/UserScreenSkeleton';
import BookingCard from '../../components/ui/user/history/BookingCard';
import AppointmentDetailsModal from '../../components/ui/user/history/modals/AppointmentDetailsModal';

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
  services?: Array<{ name?: string; price?: number | string; estimatedTime?: string | number }>;
  estCompletion?: string | number;
  cancelledAt?: string;
}

export default function CancelledBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) { setLoading(false); return; }

    const db = getDatabase();
    const userBookingsRef = ref(db, `Reservations/ReservationsByUser/${userId}`);

    const unsubscribe = onValue(userBookingsRef, (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((dateSnap) => {
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (data && data.status === 'cancelled') {
            const addOns = Array.isArray(data.addOns)
              ? data.addOns
              : data.addOns && typeof data.addOns === 'object'
              ? Object.values(data.addOns)
              : [];
            const services = Array.isArray(data.services)
              ? data.services
              : data.services && typeof data.services === 'object'
              ? Object.values(data.services)
              : [];
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
              isPaid: data.isPaid ?? false,
              vehicleName: data.vehicleDetails?.vehicleName || '',
              plateNumber: data.vehicleDetails?.plateNumber || '',
              classification: data.vehicleDetails?.classification || '',
              addOns,
              note: data.note || '',
              services,
              estCompletion: data.timeSlot?.estCompletion ?? null,
              cancelledAt: data.cancelledAt,
            });
          }
        });
      });
      setBookings(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 border-b border-[#F5F5F5]">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-[#1A1A1A] ml-2">Cancelled Bookings</Text>
      </View>

      {loading ? (
        <ListSkeleton rowCount={4} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="pt-4"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {bookings.length > 0 ? (
            bookings.map((booking) => (
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
                onPress={() => { setSelectedBooking(booking); setShowDetails(true); }}
                onViewMore={() => { setSelectedBooking(booking); setShowDetails(true); }}
              />
            ))
          ) : (
            <View className="flex-1 items-center justify-center py-24">
              <Ionicons name="close-circle-outline" size={48} color="#E0E0E0" />
              <Text className="text-base text-[#999] mt-4">No cancelled bookings</Text>
              <Text className="text-[13px] text-[#CCC] mt-1">
                Your cancelled bookings will appear here
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {selectedBooking && (
        <AppointmentDetailsModal
          visible={showDetails}
          branchName={selectedBooking.branchName}
          branchAddress={selectedBooking.address}
          branchImage={require('../../assets/images/samplebranch.png')}
          vehicleName={selectedBooking.vehicleName}
          plateNumber={selectedBooking.plateNumber}
          classification={selectedBooking.classification}
          date={selectedBooking.appointmentDate}
          time={selectedBooking.time}
          orderSummary={[
            ...(selectedBooking.services?.map((s) => ({ label: s?.name ?? 'Service', price: `₱${s?.price ?? 0}` })) ?? []),
            ...(selectedBooking.addOns?.map((a) => ({ label: a?.name ?? 'Add-on', price: `₱${a?.price ?? 0}` })) ?? []),
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
          onClose={() => { setShowDetails(false); setSelectedBooking(null); }}
        />
      )}
    </SafeAreaView>
  );
}
