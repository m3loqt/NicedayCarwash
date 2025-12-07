import { SelectBayModal, type Bay } from '@/components/ui/admin/dashboard';
import { auth, db } from '@/firebase/firebase';
import { get, onValue, ref, set, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import AppointmentCard from './AppointmentCard';
import CancelReasonModal, { CancelReason } from './CancelReasonModal';
import CompleteConfirmationModal from './CompleteConfirmationModal';

interface Booking {
  appointmentId: string;
  branchName: string;
  branchAddress: string;
  status: 'pending' | 'ongoing' | 'completed' | 'cancelled';
  timeSlot: {
    appointmentDate: string;
    time: string;
    estCompletion?: string;
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

// Parse appointment date and time to a Date object
// appointmentDate format: "MM-DD-YYYY"
// time format: "H:00 AM/PM" or "HH:00 AM/PM"
const parseAppointmentDateTime = (appointmentDate: string, time: string): Date => {
  try {
    // Parse date: MM-DD-YYYY
    const [month, day, year] = appointmentDate.split('-').map(Number);
    
    // Parse time: "H:00 AM/PM" or "HH:00 AM/PM"
    const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timeMatch) {
      throw new Error('Invalid time format');
    }
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const meridiem = timeMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return new Date(year, month - 1, day, hours, minutes);
  } catch (error) {
    // Fallback: return current date if parsing fails
    console.error('Error parsing appointment date/time:', error);
    return new Date();
  }
};

export default function AppointmentsList({ activeTab, searchQuery }: AppointmentsListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<CancelReason | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [bookingToComplete, setBookingToComplete] = useState<Booking | null>(null);
  
  // Select Bay Modal state
  const [isSelectBayModalVisible, setIsSelectBayModalVisible] = useState(false);
  const [bookingToAccept, setBookingToAccept] = useState<Booking | null>(null);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [bays, setBays] = useState<Bay[]>([]);
  const [loadingBays, setLoadingBays] = useState(false);

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
              timeSlot: data.timeSlot || { appointmentDate: '', time: '', estCompletion: undefined },
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
        const dateA = parseAppointmentDateTime(a.timeSlot.appointmentDate, a.timeSlot.time);
        const dateB = parseAppointmentDateTime(b.timeSlot.appointmentDate, b.timeSlot.time);
        return dateB.getTime() - dateA.getTime();
      });

      setBookings(bookingsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [branchId, activeTab, searchQuery]);

  // Fetch bay availability from Firebase
  const fetchBayAvailability = async (appointmentDate: string, appointmentTime: string) => {
    if (!branchId) return;

    setLoadingBays(true);
    try {
      // Get all ongoing appointments for this branch to check bay conflicts
      const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);
      const snapshot = await get(bookingsRef);

      const occupiedBays = new Set<number>();
      const appointmentDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime);

      // Check all ongoing appointments for bay conflicts
      snapshot.forEach((dateSnap) => {
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (data && data.status === 'ongoing' && data.bayNumber) {
            // Check if this appointment overlaps with the new appointment
            const existingDateTime = parseAppointmentDateTime(
              data.timeSlot?.appointmentDate || '',
              data.timeSlot?.time || ''
            );
            const estCompletion = parseInt(data.timeSlot?.estCompletion || '0', 10);
            const existingEndTime = new Date(existingDateTime.getTime() + estCompletion * 60000);

            // If appointments overlap, mark bay as unavailable
            if (
              appointmentDateTime < existingEndTime &&
              appointmentDateTime >= existingDateTime
            ) {
              occupiedBays.add(data.bayNumber);
            }
          }
        });
      });

      // Also check BayOccupancy records for real-time status
      const bayOccupancyRef = ref(db, `Branches/${branchId}/BayOccupancy`);
      const occupancySnapshot = await get(bayOccupancyRef);
      
      if (occupancySnapshot.exists()) {
        occupancySnapshot.forEach((dateSnap) => {
          dateSnap.forEach((occupancySnap) => {
            const occupancy = occupancySnap.val();
            if (occupancy && occupancy.status === 'ongoing' && occupancy.bayNumber) {
              // Check if occupancy overlaps
              if (occupancy.estimatedEndTime) {
                const endTime = new Date(occupancy.estimatedEndTime);
                if (appointmentDateTime < endTime) {
                  occupiedBays.add(occupancy.bayNumber);
                }
              }
            }
          });
        });
      }

      // Dynamically fetch all bays from database
      const baysRef = ref(db, `Branches/${branchId}/Bays`);
      const baysSnapshot = await get(baysRef);
      const bayList: Bay[] = [];

      if (baysSnapshot.exists()) {
        // Get all bays from database
        baysSnapshot.forEach((baySnap) => {
          const bayNumber = parseInt(baySnap.key || '0', 10);
          if (bayNumber > 0) {
            const bayData = baySnap.val();
            let bayStatus: 'available' | 'unavailable' = 'available';

            // Check if bay is in maintenance or permanently unavailable
            if (bayData.status === 'maintenance' || bayData.status === 'unavailable') {
              bayStatus = 'unavailable';
            } else if (occupiedBays.has(bayNumber)) {
              bayStatus = 'unavailable';
            }

            bayList.push({ number: bayNumber, status: bayStatus });
          }
        });

        // Sort bays by number
        bayList.sort((a, b) => a.number - b.number);
      }

      // If no bays exist in database, show empty list (or could show a message)
      setBays(bayList);
    } catch (error) {
      console.error('Error fetching bay availability:', error);
      // On error, try to at least get the list of bays from database (without conflict checking)
      try {
        const baysRef = ref(db, `Branches/${branchId}/Bays`);
        const baysSnapshot = await get(baysRef);
        const bayList: Bay[] = [];

        if (baysSnapshot.exists()) {
          baysSnapshot.forEach((baySnap) => {
            const bayNumber = parseInt(baySnap.key || '0', 10);
            if (bayNumber > 0) {
              const bayData = baySnap.val();
              const bayStatus: 'available' | 'unavailable' = 
                (bayData.status === 'maintenance' || bayData.status === 'unavailable') 
                  ? 'unavailable' 
                  : 'available';
              bayList.push({ number: bayNumber, status: bayStatus });
            }
          });
          bayList.sort((a, b) => a.number - b.number);
        }
        setBays(bayList);
      } catch (fallbackError) {
        console.error('Error in fallback bay fetch:', fallbackError);
        // If even fallback fails, show empty list
        setBays([]);
      }
    } finally {
      setLoadingBays(false);
    }
  };

  const handleAccept = async (booking: Booking) => {
    setBookingToAccept(booking);
    setSelectedBay(null);
    // Fetch real-time bay availability before showing modal
    await fetchBayAvailability(booking.timeSlot.appointmentDate, booking.timeSlot.time);
    setIsSelectBayModalVisible(true);
  };

  const handleBaySelect = (bayNumber: number) => {
    setSelectedBay(bayNumber);
  };

  const handleFinishBaySelection = async () => {
    if (!selectedBay || !bookingToAccept || !branchId) return;

    const adminUserId = auth.currentUser?.uid;
    if (!adminUserId) {
      Alert.alert('Error', 'Admin user not found');
      return;
    }

    try {
      // Check for conflicts one more time before assigning
      const conflictCheck = await checkBayConflict(selectedBay, bookingToAccept);
      if (conflictCheck.hasConflict) {
        Alert.alert(
          'Bay Unavailable',
          conflictCheck.reason || 'This bay is no longer available. Please select another bay.'
        );
        // Refresh bay availability
        await fetchBayAvailability(
          bookingToAccept.timeSlot.appointmentDate,
          bookingToAccept.timeSlot.time
        );
        return;
      }

      const acceptedAt = new Date().toISOString();
      const estCompletion = parseInt((bookingToAccept.timeSlot as any)?.estCompletion || '0', 10);
      const appointmentDateTime = parseAppointmentDateTime(
        bookingToAccept.timeSlot.appointmentDate,
        bookingToAccept.timeSlot.time
      );
      const estimatedEndTime = new Date(appointmentDateTime.getTime() + estCompletion * 60000);

      // Update in ReservationsByBranch
      const branchBookingRef = ref(
        db,
        `Reservations/ReservationsByBranch/${branchId}/${bookingToAccept.dateKey}/${bookingToAccept.key}`
      );
      await update(branchBookingRef, {
        status: 'ongoing',
        bayNumber: selectedBay,
        acceptedAt: acceptedAt,
        assignedBy: adminUserId,
      });

      // Find and update in ReservationsByUser
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
                if (bookingData && bookingData.appointmentId === bookingToAccept.appointmentId) {
                  const userBookingRef = ref(
                    db,
                    `Reservations/ReservationsByUser/${userId}/${dateKey}/${bookingSnap.key}`
                  );
                  updatePromises.push(
                    update(userBookingRef, {
                      status: 'ongoing',
                      bayNumber: selectedBay,
                      acceptedAt: acceptedAt,
                      assignedBy: adminUserId,
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

      // Update bay status to unavailable
      const bayRef = ref(db, `Branches/${branchId}/Bays/${selectedBay}`);
      await set(bayRef, {
        status: 'unavailable',
        currentAppointmentId: bookingToAccept.appointmentId,
        occupiedUntil: estimatedEndTime.toISOString(),
        lastUpdated: new Date().toISOString(),
      });

      // Create bay occupancy record
      const bayOccupancyRef = ref(
        db,
        `Branches/${branchId}/BayOccupancy/${bookingToAccept.dateKey}/${bookingToAccept.appointmentId}`
      );
      await set(bayOccupancyRef, {
        bayNumber: selectedBay,
        appointmentId: bookingToAccept.appointmentId,
        startTime: appointmentDateTime.toISOString(),
        estimatedEndTime: estimatedEndTime.toISOString(),
        status: 'ongoing',
        assignedBy: adminUserId,
        acceptedAt: acceptedAt,
      });

      Alert.alert('Success', `Appointment accepted and assigned to Bay ${selectedBay}`);
      handleCloseBayModal();
    } catch (error) {
      console.error('Error accepting appointment:', error);
      Alert.alert('Error', 'Failed to accept appointment. Please try again.');
    }
  };

  // Check if bay has conflicts
  const checkBayConflict = async (bayNumber: number, booking: Booking) => {
    if (!branchId) return { hasConflict: false };

    try {
      // Check if bay is unavailable
      const bayRef = ref(db, `Branches/${branchId}/Bays/${bayNumber}`);
      const baySnapshot = await get(bayRef);
      if (baySnapshot.exists()) {
        const bayData = baySnapshot.val();
        if (bayData.status === 'unavailable') {
          // Check if it's unavailable due to this appointment (re-selecting same bay is OK)
          if (bayData.currentAppointmentId && bayData.currentAppointmentId !== booking.appointmentId) {
            return { hasConflict: true, reason: 'Bay is currently unavailable' };
          }
        }
      }

      // Check for overlapping appointments
      const appointmentDateTime = parseAppointmentDateTime(
        booking.timeSlot.appointmentDate,
        booking.timeSlot.time
      );
      const estCompletion = parseInt((booking.timeSlot as any)?.estCompletion || '0', 10);
      const appointmentEndTime = new Date(appointmentDateTime.getTime() + estCompletion * 60000);

      const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);
      const snapshot = await get(bookingsRef);

      let hasConflict = false;
      snapshot.forEach((dateSnap) => {
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (
            data &&
            data.status === 'ongoing' &&
            data.bayNumber === bayNumber &&
            data.appointmentId !== booking.appointmentId
          ) {
            const existingDateTime = parseAppointmentDateTime(
              data.timeSlot?.appointmentDate || '',
              data.timeSlot?.time || ''
            );
            const existingEstCompletion = parseInt(data.timeSlot?.estCompletion || '0', 10);
            const existingEndTime = new Date(
              existingDateTime.getTime() + existingEstCompletion * 60000
            );

            // Check for overlap
            if (
              (appointmentDateTime >= existingDateTime && appointmentDateTime < existingEndTime) ||
              (appointmentEndTime > existingDateTime && appointmentEndTime <= existingEndTime) ||
              (appointmentDateTime <= existingDateTime && appointmentEndTime >= existingEndTime)
            ) {
              hasConflict = true;
            }
          }
        });
      });

      return { hasConflict, reason: hasConflict ? 'Bay is already assigned to another appointment at this time' : undefined };
    } catch (error) {
      console.error('Error checking bay conflict:', error);
      return { hasConflict: false };
    }
  };

  const handleCloseBayModal = () => {
    setIsSelectBayModalVisible(false);
    setBookingToAccept(null);
    setSelectedBay(null);
  };

  const handleComplete = (booking: Booking) => {
    setBookingToComplete(booking);
    setCompleteModalVisible(true);
  };

  const handleCompleteModalClose = () => {
    setCompleteModalVisible(false);
    setBookingToComplete(null);
  };

  const handleCompleteConfirm = async () => {
    if (!bookingToComplete || !branchId) return;

    try {
      // Get bay number before updating status
      const branchBookingRef = ref(
        db,
        `Reservations/ReservationsByBranch/${branchId}/${bookingToComplete.dateKey}/${bookingToComplete.key}`
      );
      const bookingSnapshot = await get(branchBookingRef);
      const bayNumber = bookingSnapshot.val()?.bayNumber;

      // Update in ReservationsByBranch
      await update(branchBookingRef, { status: 'completed' });

      // Find and update in ReservationsByUser
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
                if (bookingData && bookingData.appointmentId === bookingToComplete.appointmentId) {
                  const userBookingRef = ref(
                    db,
                    `Reservations/ReservationsByUser/${userId}/${dateKey}/${bookingSnap.key}`
                  );
                  updatePromises.push(
                    update(userBookingRef, {
                      status: 'completed',
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

      // Release bay if it was assigned
      if (bayNumber) {
        const bayRef = ref(db, `Branches/${branchId}/Bays/${bayNumber}`);
        await update(bayRef, {
          status: 'available',
          currentAppointmentId: null,
          occupiedUntil: null,
          lastUpdated: new Date().toISOString(),
        });

        // Update bay occupancy record
        const bayOccupancyRef = ref(
          db,
          `Branches/${branchId}/BayOccupancy/${bookingToComplete.dateKey}/${bookingToComplete.appointmentId}`
        );
        const occupancySnapshot = await get(bayOccupancyRef);
        if (occupancySnapshot.exists()) {
          await update(bayOccupancyRef, {
            status: 'completed',
            completedAt: new Date().toISOString(),
          });
        }
      }

      Alert.alert('Success', 'Appointment completed successfully');
      handleCompleteModalClose();
    } catch (error) {
      console.error('Error completing appointment:', error);
      Alert.alert('Error', 'Failed to complete appointment');
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
      // Get bay number before updating status
      const branchBookingRef = ref(
        db,
        `Reservations/ReservationsByBranch/${branchId}/${bookingToCancel.dateKey}/${bookingToCancel.key}`
      );
      const bookingSnapshot = await get(branchBookingRef);
      const bayNumber = bookingSnapshot.val()?.bayNumber;

      // Update in ReservationsByBranch
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

      // Release bay if it was assigned (only if status was ongoing)
      if (bayNumber && bookingSnapshot.val()?.status === 'ongoing') {
        const bayRef = ref(db, `Branches/${branchId}/Bays/${bayNumber}`);
        await update(bayRef, {
          status: 'available',
          currentAppointmentId: null,
          occupiedUntil: null,
          lastUpdated: new Date().toISOString(),
        });

        // Update bay occupancy record
        const bayOccupancyRef = ref(
          db,
          `Branches/${branchId}/BayOccupancy/${bookingToCancel.dateKey}/${bookingToCancel.appointmentId}`
        );
        const occupancySnapshot = await get(bayOccupancyRef);
        if (occupancySnapshot.exists()) {
          await update(bayOccupancyRef, {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
          });
        }
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
              onComplete={() => handleComplete(booking)}
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

      {/* Complete Confirmation Modal */}
      <CompleteConfirmationModal
        visible={completeModalVisible}
        onClose={handleCompleteModalClose}
        onConfirm={handleCompleteConfirm}
      />

      {/* Select Bay Modal */}
      <SelectBayModal
        visible={isSelectBayModalVisible}
        bays={bays}
        selectedBay={selectedBay}
        onClose={handleCloseBayModal}
        onBaySelect={handleBaySelect}
        onFinish={handleFinishBaySelection}
        loading={loadingBays}
      />
    </View>
  );
}

