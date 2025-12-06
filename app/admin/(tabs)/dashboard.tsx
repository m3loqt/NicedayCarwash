import {
    AdminDashboardHeader,
    ManageServicesCard,
    NotificationsList,
    TransactionSummaryCards,
} from '@/components/ui/admin/dashboard';
import { auth, db } from '@/firebase/firebase';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Booking {
  appointmentId: string;
  branchName: string;
  branchAddress: string;
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  timeSlot: {
    appointmentDate: string;
    time: string;
  };
  vehicleDetails: {
    vehicleName: string;
    plateNumber: string;
    classification: string;
  };
  amountDue: number;
}

interface TransactionCounts {
  pending: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

export default function AdminDashboardScreen() {
  const [transactionCounts, setTransactionCounts] = useState<TransactionCounts>({
    pending: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
  });
  const [pendingReservations, setPendingReservations] = useState<Booking[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminBranch = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const userSnapshot = await get(ref(db, `users/${uid}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          const adminBranchId = userData.branchId || userData.branch;

          if (adminBranchId) {
            setBranchId(adminBranchId);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching admin branch:', error);
        setLoading(false);
      }
    };

    fetchAdminBranch();
  }, []);

  useEffect(() => {
    if (!branchId) return;

    const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);

    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      const bookings: Booking[] = [];
      const counts: TransactionCounts = {
        pending: 0,
        ongoing: 0,
        completed: 0,
        cancelled: 0,
      };

      snapshot.forEach((dateSnap) => {
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (data) {
            const booking: Booking = {
              appointmentId: data.appointmentId || bookingSnap.key || '',
              branchName: data.branchName || '',
              branchAddress: data.branchAddress || '',
              status: data.status || 'pending',
              timeSlot: data.timeSlot || { appointmentDate: '', time: '' },
              vehicleDetails: data.vehicleDetails || {
                vehicleName: '',
                plateNumber: '',
                classification: '',
              },
              amountDue: data.amountDue || 0,
            };

            bookings.push(booking);

            // Count by status
            if (booking.status === 'pending') {
              counts.pending++;
            } else if (booking.status === 'ongoing') {
              counts.ongoing++;
            } else if (booking.status === 'completed') {
              counts.completed++;
            } else if (booking.status === 'cancelled') {
              counts.cancelled++;
            }
          }
        });
      });

      // Filter pending bookings, sort by appointment datetime (descending), limit to 10
      const pending = bookings
        .filter((b) => b.status === 'pending')
        .sort((a, b) => {
          const dateA = new Date(`${a.timeSlot.appointmentDate} ${a.timeSlot.time}`);
          const dateB = new Date(`${b.timeSlot.appointmentDate} ${b.timeSlot.time}`);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 10);

      setPendingReservations(pending);
      setTransactionCounts(counts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [branchId]);

  const formatDate = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return '';

    try {
      // Split MM-DD-YYYY string and convert to Date object
      const [month, day, year] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      const dayName = days[date.getDay()];
      const monthName = months[date.getMonth()];

      // Use provided time string or empty string
      const time = timeStr || '';

      return `${dayName}, ${monthName} ${day}, ${year} at ${time}`;
    } catch (error) {
      // Fallback: try parsing as ISO date or return as-is
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const months = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ];
          const dayName = days[date.getDay()];
          const monthName = months[date.getMonth()];
          return `${dayName}, ${monthName} ${date.getDate()}, ${date.getFullYear()} at ${timeStr}`;
        }
      } catch (e) {
        // Return concatenated strings when all parsing attempts fail
        return `${dateStr} at ${timeStr}`;
      }
      return `${dateStr} at ${timeStr}`;
    }
  };

  const formatPrice = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  const handleManageServicesPress = () => {
    // Placeholder: navigation to services management screen not yet implemented
    console.log('Navigate to manage services');
  };

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: 'white' }}>
        <SafeAreaView className="flex-1" style={{ backgroundColor: 'white' }} edges={['top']}>
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-600" style={{ fontFamily: 'Inter_400Regular' }}>
              Loading...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: 'white' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: 'white' }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={{ backgroundColor: 'white', flex: 1 }}
          contentContainerStyle={{
            backgroundColor: 'white',
            paddingBottom: 80,
            flexGrow: 1,
          }}
        >
          <AdminDashboardHeader />
          <TransactionSummaryCards counts={transactionCounts} />
          <ManageServicesCard onPress={handleManageServicesPress} />
          <NotificationsList
            reservations={pendingReservations}
            formatDate={formatDate}
            formatPrice={formatPrice}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
