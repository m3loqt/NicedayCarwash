import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
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
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  vehicleName?: string;
  plateNumber?: string;
  classification?: string;
  // Additional booking details from database
  addOns?: Array<{ name?: string; price?: number | string; estimatedTime?: string | number }>;
  services?: Array<{ name?: string; price?: number | string; estimatedTime?: string | number; status?: string }>;
  estCompletion?: string | number;

}

interface HistoryListProps {
  activeTab: string;
}

export default function HistoryList({ activeTab }: HistoryListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.log('No user logged in');
      setLoading(false);
      return;
    }

    const db = getDatabase();
    const userBookingsRef = ref(db, `Reservations/ReservationsByUser/${userId}`);
    console.log('Fetching bookings for user:', userId);

    const unsubscribe = onValue(userBookingsRef, (snapshot) => {
      const list: Booking[] = [];

      snapshot.forEach((dateSnap) => {
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (data && data.status === activeTab) {
            // Convert addOns to array format (handles null, array, or object with numeric keys)
            const addOnsObj = data.addOns;
            let addOns: any[] = [];
            if (Array.isArray(addOnsObj)) {
              addOns = addOnsObj;
            } else if (addOnsObj && typeof addOnsObj === 'object') {
              addOns = Object.keys(addOnsObj).map((k) => addOnsObj[k]);
            }

            // Convert services to array format (handles null, array, or object with numeric keys)
            const servicesObj = data.services;
            let services: any[] = [];
            if (Array.isArray(servicesObj)) {
              services = servicesObj;
            } else if (servicesObj && typeof servicesObj === 'object') {
              services = Object.keys(servicesObj).map((k) => servicesObj[k]);
            }

            // Extract estimated completion time from timeSlot object
            const estCompletion = data.timeSlot?.estCompletion ?? null;

            // Use Firebase snapshot key as appointment ID (ND-XXXXXX format)
            const appointmentId = bookingSnap.key || '';
            
            list.push({
              id: appointmentId,
              branchName: data.branchName || '',
              address: data.branchAddress || '',
              appointmentId: appointmentId,
              paymentMethod: data.paymentMethod || '',
              time: data.timeSlot?.time || '',
              appointmentDate: data.timeSlot?.appointmentDate || '',
              amount: data.amountDue || '',
              status: data.status,
              vehicleName: data.vehicleDetails?.vehicleName || '',
              plateNumber: data.vehicleDetails?.plateNumber || '',
              classification: data.vehicleDetails?.classification || '',
              addOns: addOns,
              note: data.note || '',
              services: services,
              estCompletion: estCompletion,
            });
          }
        });
      });

      console.log('Fetched bookings:', list);
      setBookings(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  const handleBookingPress = (booking: Booking) => {
    console.log('Booking pressed:', booking.id);
    setSelectedBooking(booking);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedBooking(null);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'white' }}>
        <Text>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: 'white' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={{ backgroundColor: 'white', flex: 1 }}
        className="pt-4"
        contentContainerStyle={{ paddingBottom: 80, backgroundColor: 'white' }}
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
              vehicleName={booking.vehicleName}
              plateNumber={booking.plateNumber}
              classification={booking.classification}
              onPress={() => handleBookingPress(booking)}
              onViewMore={() => handleBookingPress(booking)}
            />
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-lg text-gray-500 text-center">
              No {activeTab} bookings found
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-2">
              Your {activeTab} bookings will appear here
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Appointment Details Modal */}
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
            typeof selectedBooking.estCompletion === "number"
              ? `${selectedBooking.estCompletion} Hours`
              : selectedBooking.estCompletion
          }
          note={selectedBooking.note}
          onClose={handleCloseDetails}
        />
      )}
    </View>
  );
}
