import { ScrollView, Text, View } from 'react-native';
import BookingCard from './BookingCard';

const mockBookings = {
  pending: [
    {
      id: '1',
      branchName: 'P. Mabolo',
      address: 'Along Pope John Paul Avenue, Cebu City',
      appointmentId: '#ND-2024-01',
      appointmentDate: '12/2/2024',
      amount: '₱250.00',
      status: 'pending' as const,
      vehicleName: 'Toyota Fortuner',
      plateNumber: 'ND-213-5921',
      classification: 'SUV'
    },
    {
      id: '2',
      branchName: 'Bacolod',
      address: 'The District North Point, Talisay City, Negros Occidental',
      appointmentId: '#ND-2024-02',
      appointmentDate: '12/3/2024',
      amount: '₱200.00',
      status: 'pending' as const
    }
  ],
  ongoing: [
    {
      id: '3',
      branchName: 'P. Mabolo',
      address: 'Along Pope John Paul Avenue, Cebu City',
      appointmentId: '#ND-2024-03',
      appointmentDate: '12/2/2024',
      amount: '₱250.00',
      status: 'ongoing' as const
    }
  ],
  completed: [
    {
      id: '4',
      branchName: 'P. Mabolo',
      address: 'Along Pope John Paul Avenue, Cebu City',
      appointmentId: '#ND-2024-04',
      appointmentDate: '12/1/2024',
      amount: '₱250.00',
      status: 'completed' as const
    }
  ],
  canceled: [
    {
      id: '5',
      branchName: 'P. Mabolo',
      address: 'Along Pope John Paul Avenue, Cebu City',
      appointmentId: '#ND-2024-05',
      appointmentDate: '12/1/2024',
      amount: '₱250.00',
      status: 'cancelled' as const
    }
  ]
};

interface HistoryListProps {
  activeTab: string;
}

export default function HistoryList({ activeTab }: HistoryListProps) {
  const handleBookingPress = (bookingId: string) => {
    console.log('Booking pressed:', bookingId);
  };

  const getBookingsForTab = (tab: string) => {
    switch (tab) {
      case 'pending':
        return mockBookings.pending;
      case 'ongoing':
        return mockBookings.ongoing;
      case 'completed':
        return mockBookings.completed;
      case 'canceled':
        return mockBookings.canceled;
      default:
        return [];
    }
  };

  const bookings = getBookingsForTab(activeTab);

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        className="pt-4"
        contentContainerStyle={{ paddingBottom: 20 }}
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
              onPress={() => handleBookingPress(booking.id)}
            />
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-lg text-gray-500 text-center">No {activeTab} bookings found</Text>
            <Text className="text-sm text-gray-400 text-center mt-2">
              Your {activeTab} bookings will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
