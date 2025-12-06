import { auth, db } from '@/firebase/firebase';
import { get, onValue, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import AppointmentCard from './AppointmentCard';
import CancelReasonModal, { CancelReason } from './CancelReasonModal';

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
  key: string; // Firebase key for updates
  dateKey: string; // Date key in Firebase structure
}

interface AppointmentsListProps {
  activeTab: string;
  searchQuery: string;
}

export default function AppointmentsList({ activeTab, searchQuery }: AppointmentsListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<CancelReason | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

  useEffect(() => {
    const fetchAdminBranch = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
          const userData = snapshot.val();
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
      const bookingsList: Booking[] = [];

      snapshot.forEach((dateSnap) => {
        const dateKey = dateSnap.key || '';
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
              key: bookingSnap.key || '',
              dateKey: dateKey,
            };

            // Filter by active tab
            if (booking.status === activeTab || (activeTab === 'cancelled' && booking.status === 'cancelled')) {
              // Filter by search query
              const searchLower = searchQuery.toLowerCase();
              if (
                !searchQuery ||
                booking.appointmentId.toLowerCase().includes(searchLower) ||
                booking.vehicleDetails.vehicleName.toLowerCase().includes(searchLower) ||
                booking.vehicleDetails.plateNumber.toLowerCase().includes(searchLower)
              ) {
                bookingsList.push(booking);
              }
            }
          }
        });
      });

      // Sort by appointment date/time (newest first)
      bookingsList.sort((a, b) => {
        const dateA = new Date(`${a.timeSlot.appointmentDate} ${a.timeSlot.time}`);
        const dateB = new Date(`${b.timeSlot.appointmentDate} ${b.timeSlot.time}`);
        return dateB.getTime() - dateA.getTime();
      });

      setBookings(bookingsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [branchId, activeTab, searchQuery]);

  const handleAccept = async (booking: Booking) => {
    try {
      Alert.alert('Accept Appointment', 'Are you sure you want to accept this appointment?', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: async () => {
            const bookingRef = ref(
              db,
              `Reservations/ReservationsByBranch/${branchId}/${booking.dateKey}/${booking.key}`
            );
            await update(bookingRef, { status: 'ongoing' });
            Alert.alert('Success', 'Appointment accepted successfully');
          },
        },
      ]);
    } catch (error) {
      console.error('Error accepting appointment:', error);
      Alert.alert('Error', 'Failed to accept appointment');
    }
  };

  const handleCancel = (booking: Booking) => {
    setBookingToCancel(booking);
    setSelectedCancelReason(null);
    setCancelModalVisible(true);
  };

  const handleCancelModalClose = () => {
    setCancelModalVisible(false);
    setSelectedCancelReason(null);
    setBookingToCancel(null);
  };

  const handleFinishCancel = async () => {
    if (!bookingToCancel || !selectedCancelReason || !branchId) return;

    try {
      // Update in ReservationsByBranch
      const branchBookingRef = ref(
        db,
        `Reservations/ReservationsByBranch/${branchId}/${bookingToCancel.dateKey}/${bookingToCancel.key}`
      );
      await update(branchBookingRef, {
        status: 'cancelled',
        cancelReason: selectedCancelReason,
      });

      // Find and update in ReservationsByUser
      // Search through all users to find the one with this appointmentId
      const reservationsByUserRef = ref(db, 'Reservations/ReservationsByUser');
      const usersSnapshot = await get(reservationsByUserRef);
      
      const updatePromises: Promise<void>[] = [];
      
      if (usersSnapshot.exists()) {
        usersSnapshot.forEach((userSnap) => {
          const userId = userSnap.key;
          if (userId) {
            userSnap.forEach((dateSnap) => {
              const dateKey = dateSnap.key;
              dateSnap.forEach((bookingSnap) => {
                const bookingData = bookingSnap.val();
                if (bookingData && bookingData.appointmentId === bookingToCancel.appointmentId) {
                  // Found the user's booking, update it
                  const userBookingRef = ref(
                    db,
                    `Reservations/ReservationsByUser/${userId}/${dateKey}/${bookingSnap.key}`
                  );
                  updatePromises.push(
                    update(userBookingRef, {
                      status: 'cancelled',
                      cancelReason: selectedCancelReason,
                    }).then(() => {})
                  );
                }
              });
            });
          }
        });
      }
      
      // Wait for all user updates to complete
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      Alert.alert('Success', 'Appointment cancelled successfully');
      handleCancelModalClose();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment');
    }
  };

  const handleViewMore = (booking: Booking) => {
    // TODO: Navigate to appointment details screen or show modal
    console.log('View more for appointment:', booking.appointmentId);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-20">
        <Text className="text-lg text-gray-500">Loading appointments...</Text>
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
            <AppointmentCard
              key={`${booking.dateKey}-${booking.key}`}
              appointmentId={booking.appointmentId}
              date={booking.timeSlot.appointmentDate}
              time={booking.timeSlot.time}
              vehicleName={booking.vehicleDetails.vehicleName}
              classification={booking.vehicleDetails.classification}
              amountDue={booking.amountDue}
              status={booking.status}
              onAccept={() => handleAccept(booking)}
              onCancel={() => handleCancel(booking)}
              onViewMore={() => handleViewMore(booking)}
            />
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-lg text-gray-500 text-center">
              No {activeTab} appointments found
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-2">
              {searchQuery ? 'Try a different search term' : `Your ${activeTab} appointments will appear here`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Cancel Reason Modal */}
      <CancelReasonModal
        visible={cancelModalVisible}
        selectedReason={selectedCancelReason}
        onReasonSelect={setSelectedCancelReason}
        onClose={handleCancelModalClose}
        onFinish={handleFinishCancel}
      />
    </View>
  );
}

