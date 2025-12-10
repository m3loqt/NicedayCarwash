import { Text, View } from 'react-native';
import NotificationItem from './NotificationItem';

interface Booking {
  appointmentId: string;
  status?: string;
  isPaid?: boolean;
  vehicleDetails: {
    classification: string;
  };
  timeSlot: {
    appointmentDate: string;
    time: string;
  };
  amountDue: number;
}

interface NotificationsListProps {
  reservations: Booking[];
  formatDate: (dateStr: string, timeStr: string) => string;
  formatPrice: (amount: number) => string;
}

export default function NotificationsList({ reservations, formatDate, formatPrice }: NotificationsListProps) {
  return (
    <View className="mt-2 mb-2">
      {reservations.length === 0 ? (
        <View className="bg-white rounded-md p-6 items-center shadow-sm border border-gray-100">
          <Text className="text-[#1E1E1E] text-xl font-bold mb-1" style={{ fontFamily: 'Inter_700Bold' }}>
            Notifications
          </Text>
          <Text className="text-gray-500 text-sm" style={{ fontFamily: 'Inter_400Regular' }}>
            No pending reservations
          </Text>
        </View>
      ) : (
        <View className="bg-white shadow-sm border-y border-gray-200">
          <View className="px-6 pt-4 pb-2">
            <Text className="text-[#1E1E1E] text-xl font-bold" style={{ fontFamily: 'Inter_700Bold' }}>
              Notifications
            </Text>
          </View>
          {reservations.map((reservation, index) => (
            <NotificationItem
              key={reservation.appointmentId}
              appointmentId={reservation.appointmentId}
              vehicleClassification={reservation.vehicleDetails.classification || 'Vehicle'}
              dateTime={formatDate(reservation.timeSlot.appointmentDate, reservation.timeSlot.time)}
              amount={formatPrice(reservation.amountDue)}
              status={reservation.status}
              isPaid={reservation.isPaid}
              isLast={index === reservations.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

