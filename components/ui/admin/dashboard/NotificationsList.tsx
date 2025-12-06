import { Text, View } from 'react-native';
import NotificationItem from './NotificationItem';

interface Booking {
  appointmentId: string;
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
    <View className="px-4 mt-6 mb-6">
      <Text className="text-gray-900 text-lg font-bold mb-4" style={{ fontFamily: 'Inter_700Bold' }}>
        Notifications
      </Text>

      {reservations.length === 0 ? (
        <View className="bg-white rounded-xl p-6 items-center">
          <Text className="text-gray-500 text-sm" style={{ fontFamily: 'Inter_400Regular' }}>
            No pending reservations
          </Text>
        </View>
      ) : (
        <View>
          {reservations.map((reservation) => (
            <NotificationItem
              key={reservation.appointmentId}
              appointmentId={reservation.appointmentId}
              vehicleClassification={reservation.vehicleDetails.classification || 'Vehicle'}
              dateTime={formatDate(reservation.timeSlot.appointmentDate, reservation.timeSlot.time)}
              amount={formatPrice(reservation.amountDue)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

