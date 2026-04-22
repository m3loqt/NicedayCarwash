import {
    AdminDashboardHeader,
    ManageServicesCard,
    NextUpCard,
    NotificationsList,
    TransactionSummaryCards,
} from '@/components/ui/admin/dashboard';
import type { NextUpItem } from '@/components/ui/admin/dashboard/NextUpCard';
import { DashboardSkeleton } from '@/components/ui/admin/AdminScreenSkeleton';
import AppointmentDetailsModal from '@/components/ui/user/history/modals/AppointmentDetailsModal';
import { auth, db } from '@/firebase/firebase';
import { logError } from '@/lib/logger';
import { router } from 'expo-router';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Booking {
  appointmentId: string;
  branchName: string;
  branchAddress: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  isPaid?: boolean;
  timeSlot: {
    appointmentDate: string;
    time: string;
    estCompletion?: string | number;
  };
  vehicleDetails: {
    vehicleName: string;
    plateNumber: string;
    classification: string;
  };
  amountDue: number;
  services?: Array<{ name?: string; price?: number | string }>;
  addOns?: Array<{ name?: string; price?: number | string }>;
  paymentMethod?: string;
  note?: string;
}

interface TransactionCounts {
  pending: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

// Parses appointment date (MM-DD-YYYY) and time (H:00 AM/PM or HH:00 AM/PM) into a Date object
const parseAppointmentDateTime = (appointmentDate: string, time: string): Date => {
  try {
    // Parsing date components from MM-DD-YYYY format
    const [month, day, year] = appointmentDate.split('-').map(Number);
    
    // Parsing time components from 12-hour format
    const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      throw new Error('Invalid time format');
    }
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3].toUpperCase();
    
    // Converting 12-hour format to 24-hour format
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return new Date(year, month - 1, day, hours, minutes);
  } catch (error) {
    // Returning current date when parsing fails
    logError('AdminDashboard.parseAppointmentDateTime', error, { context: 'Error parsing appointment date/time' });
    return new Date();
  }
};

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const [transactionCounts, setTransactionCounts] = useState<TransactionCounts>({
    pending: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
  });
  const [pendingReservations, setPendingReservations] = useState<Booking[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextUpList, setNextUpList] = useState<NextUpItem[]>([]);
  const [selectedNotificationBooking, setSelectedNotificationBooking] = useState<Booking | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

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
        logError('AdminDashboard.fetchAdminBranch', error, { context: 'Error fetching admin branch' });
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
              isPaid: data.isPaid !== undefined ? data.isPaid : false,
              timeSlot: data.timeSlot || { appointmentDate: '', time: '' },
              vehicleDetails: data.vehicleDetails || {
                vehicleName: '',
                plateNumber: '',
                classification: '',
              },
              amountDue: data.amountDue || 0,
              services: data.services,
              addOns: data.addOns,
              paymentMethod: data.paymentMethod,
              note: data.note,
            };

            bookings.push(booking);

            // Counting by status (accepted counts as pending for display)
            if (booking.status === 'pending' || booking.status === 'accepted') {
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

      // Filtering pending and accepted bookings (accepted = waiting for payment), sorting by appointment datetime (descending), limiting to 10
      const pending = bookings
        .filter((b) => b.status === 'pending' || b.status === 'accepted')
        .sort((a, b) => {
          const dateA = parseAppointmentDateTime(a.timeSlot.appointmentDate, a.timeSlot.time);
          const dateB = parseAppointmentDateTime(b.timeSlot.appointmentDate, b.timeSlot.time);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 10);

      const now = new Date();
      const nextUp = bookings
        .filter((b) => {
          const dt = parseAppointmentDateTime(b.timeSlot?.appointmentDate || '', b.timeSlot?.time || '');
          return dt.getTime() >= now.getTime();
        })
        .sort((a, b) => {
          const dateA = parseAppointmentDateTime(a.timeSlot.appointmentDate, a.timeSlot.time);
          const dateB = parseAppointmentDateTime(b.timeSlot.appointmentDate, b.timeSlot.time);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 3)
        .map((b): NextUpItem => ({
          appointmentId: b.appointmentId,
          timeLabel: b.timeSlot?.time || '—',
          vehicleLabel: b.vehicleDetails?.vehicleName || b.vehicleDetails?.classification || 'Vehicle',
          amountFormatted: `P${(b.amountDue ?? 0).toFixed(2)}`,
        }));

      setNextUpList(nextUp);
      setPendingReservations(pending);
      setTransactionCounts(counts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [branchId]);

  const formatDate = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return '';

    try {
      // Splitting MM-DD-YYYY string and converting to Date object
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

      // Using provided time string or empty string
      const time = timeStr || '';

      return `${dayName}, ${monthName} ${day}, ${year} at ${time}`;
    } catch (error) {
      // Falling back to parsing as ISO date or returning as-is
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
        // Returning concatenated strings when all parsing attempts fail
        return `${dateStr} at ${timeStr}`;
      }
      return `${dateStr} at ${timeStr}`;
    }
  };

  const formatPrice = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  const handleManageServicesPress = () => {
    router.push('/admin/services');
  };

  const handleTransactionCardPress = (tab: 'pending' | 'ongoing' | 'completed' | 'cancelled') => {
    router.push(`/admin/bookings?tab=${tab}`);
  };

  const handleNotificationEntryPress = (reservation: Booking) => {
    setSelectedNotificationBooking(reservation);
    setDetailsModalVisible(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedNotificationBooking(null);
  };

  const handleDetailsModalAction = () => {
    handleCloseDetailsModal();
    router.push('/admin/bookings?tab=pending');
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#F9EF08" />
        <View style={{ height: insets.top, backgroundColor: '#F9EF08' }} />
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 80, flexGrow: 1 }}
          >
            <AdminDashboardHeader />
            <DashboardSkeleton />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#F9EF08" />
      <View style={{ height: insets.top, backgroundColor: '#F9EF08' }} />
      <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
        <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ backgroundColor: '#FFFFFF', flex: 1 }}
            contentContainerStyle={{
              backgroundColor: '#FFFFFF',
              paddingBottom: 80,
              flexGrow: 1,
            }}
          >
            <AdminDashboardHeader />
            <TransactionSummaryCards counts={transactionCounts} onCardPress={handleTransactionCardPress} />
            <ManageServicesCard onPress={handleManageServicesPress} />
            <NextUpCard items={nextUpList} />
            <NotificationsList
            reservations={pendingReservations}
            formatDate={formatDate}
            formatPrice={formatPrice}
            onEntryPress={handleNotificationEntryPress}
          />
        </ScrollView>

        {selectedNotificationBooking && (
          <AppointmentDetailsModal
            visible={detailsModalVisible}
            branchName={selectedNotificationBooking.branchName}
            branchAddress={selectedNotificationBooking.branchAddress}
            branchImage={require('../../../assets/images/branch1.jpg')}
            vehicleName={selectedNotificationBooking.vehicleDetails.vehicleName}
            plateNumber={selectedNotificationBooking.vehicleDetails.plateNumber}
            classification={selectedNotificationBooking.vehicleDetails.classification}
            date={selectedNotificationBooking.timeSlot.appointmentDate}
            time={selectedNotificationBooking.timeSlot.time}
            orderSummary={[
              ...(selectedNotificationBooking.services?.map((s) => ({
                label: (s?.name ?? 'Service') as string,
                price: `₱${s?.price ?? '0'}`,
              })) ?? []),
              ...(selectedNotificationBooking.addOns?.map((a) => ({
                label: (a?.name ?? 'Add-on') as string,
                price: `₱${a?.price ?? '0'}`,
              })) ?? []),
              { label: 'Booking Fee', price: '₱25' },
            ]}
            amountDue={`₱${selectedNotificationBooking.amountDue.toFixed(2)}`}
            paymentMethod={selectedNotificationBooking.paymentMethod || 'Not selected'}
            estimatedCompletion={
              selectedNotificationBooking.timeSlot.estCompletion != null
                ? typeof selectedNotificationBooking.timeSlot.estCompletion === 'number'
                  ? `${selectedNotificationBooking.timeSlot.estCompletion} Hours`
                  : String(selectedNotificationBooking.timeSlot.estCompletion)
                : undefined
            }
            note={selectedNotificationBooking.note}
            status={selectedNotificationBooking.status}
            isPaid={selectedNotificationBooking.isPaid}
            appointmentId={selectedNotificationBooking.appointmentId}
            isAdminView
            onClose={handleCloseDetailsModal}
            onAccept={handleDetailsModalAction}
            onCancel={handleDetailsModalAction}
            onComplete={handleDetailsModalAction}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
