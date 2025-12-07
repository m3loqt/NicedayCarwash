import { SelectBayModal, type Bay } from '@/components/ui/admin/dashboard';
import AppointmentDetailsModal from '@/components/ui/user/history/modals/AppointmentDetailsModal';
import { auth, db } from '@/firebase/firebase';
import { get, onValue, ref, set, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import AppointmentCard from './AppointmentCard';
import CancelReasonModal, { CancelReason } from './CancelReasonModal';
import CompleteConfirmationModal from './CompleteConfirmationModal';
import SuccessModal from './SuccessModal';

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
  // Additional booking details from database
  addOns?: Array<{ name?: string; price?: number | string; estimatedTime?: string | number }>;
  services?: Array<{ name?: string; price?: number | string; estimatedTime?: string | number; status?: string }>;
  paymentMethod?: string;
  note?: string;
}

interface AppointmentsListProps {
  activeTab: string;
  searchQuery: string;
}

// Format date from MM-DD-YYYY to "December 6, 2025" format
const formatDateForDisplay = (dateString?: string): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  if (month < 1 || month > 12) return dateString;
  
  return `${monthNames[month - 1]} ${day}, ${year}`;
};

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

/**
 * Converts a Date object to ISO string format preserving local time values
 * Extracts local time components and formats as YYYY-MM-DDTHH:mm:ss.SSS (no timezone suffix)
 * Used to store appointment times without UTC conversion
 */
const toLocalISOString = (date: Date): string => {
  // Extract local timezone components from Date object
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-11 -> 1-12
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  
  // Format components as zero-padded strings
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  const msStr = String(milliseconds).padStart(3, '0');
  
  // Return ISO-like string without timezone suffix (no 'Z')
  return `${year}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:${secondsStr}.${msStr}`;
};

/**
 * Parses an ISO string (without timezone) back to a Date object
 * Interprets the time components as local time, not UTC
 */
const parseLocalISOString = (isoString: string): Date => {
  if (!isoString) return new Date();
  // Remove timezone indicators ('Z' or offset) to parse as local time
  const cleanString = isoString.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
  const [datePart, timePart] = cleanString.split('T');
  if (!datePart || !timePart) return new Date(isoString); // Fallback to standard parsing
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [time, ms] = timePart.split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const milliseconds = ms ? parseInt(ms, 10) : 0;
  
  // Create date in local timezone
  return new Date(year, month - 1, day, hours, minutes, seconds || 0, milliseconds);
};

/**
 * Converts date from MM-DD-YYYY to YYYY-MM-DD format
 */
const convertDateToCalendarFormat = (dateString: string): string => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  // MM-DD-YYYY -> YYYY-MM-DD
  return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
};

/**
 * Extracts hour number from time string (e.g., "8:00 AM" -> "8", "11:00 PM" -> "11")
 */
const extractTimeSlotHour = (timeString: string): string => {
  if (!timeString) return '';
  const timeMatch = timeString.match(/(\d{1,2}):/);
  if (timeMatch) {
    return timeMatch[1];
  }
  // If it's already just a number, return it
  const numMatch = timeString.match(/^(\d+)$/);
  return numMatch ? numMatch[1] : '';
};

/**
 * Formats bay number for calendar (handles both number and string formats)
 */
const formatBayNumberForCalendar = (bayNumber: number | string | undefined): string => {
  if (!bayNumber) return '';
  if (typeof bayNumber === 'number') {
    return `Bay${bayNumber}`;
  }
  if (typeof bayNumber === 'string') {
    // If it already has "Bay" prefix, return as is, otherwise add it
    if (bayNumber.toLowerCase().startsWith('bay')) {
      return bayNumber;
    }
    return `Bay${bayNumber}`;
  }
  return '';
};

/**
 * Finds userId for an appointment from ReservationsByUser
 */
const findUserIdForAppointment = async (appointmentId: string): Promise<string> => {
  try {
    const reservationsByUserRef = ref(db, 'Reservations/ReservationsByUser');
    const usersSnapshot = await get(reservationsByUserRef);
    
    if (usersSnapshot.exists()) {
      for (const userId in usersSnapshot.val()) {
        const userSnap = usersSnapshot.val()[userId];
        if (userSnap) {
          for (const dateKey in userSnap) {
            const dateSnap = userSnap[dateKey];
            if (dateSnap) {
              for (const bookingKey in dateSnap) {
                const bookingData = dateSnap[bookingKey];
                if (bookingData && bookingData.appointmentId === appointmentId) {
                  return userId;
                }
              }
            }
          }
        }
      }
    }
    return '';
  } catch (error) {
    console.error('Error finding userId:', error);
    return '';
  }
};

/**
 * Updates or creates calendar entry for cancelled or completed appointments
 */
const updateCalendarEntry = async (
  branchId: string,
  booking: Booking,
  status: 'cancelled' | 'completed',
  bayNumber?: number | string
) => {
  try {
    const calendarDate = convertDateToCalendarFormat(booking.timeSlot.appointmentDate);
    const timeSlot = extractTimeSlotHour(booking.timeSlot.time);
    const estCompletion = String(booking.timeSlot.estCompletion || '');
    const plateNumber = booking.vehicleDetails.plateNumber || '';
    const vehicleClassification = booking.vehicleDetails.classification || '';
    const formattedBayNumber = formatBayNumberForCalendar(bayNumber);
    const userId = await findUserIdForAppointment(booking.appointmentId);

    const calendarRef = ref(
      db,
      `Calendar/${branchId}/${calendarDate}/${booking.appointmentId}`
    );

    await set(calendarRef, {
      appointmentId: booking.appointmentId,
      bayNumber: formattedBayNumber,
      estCompletion: estCompletion,
      plateNumber: plateNumber,
      status: status,
      timeSlot: timeSlot,
      userId: userId,
      vehicleClassification: vehicleClassification,
    });
  } catch (error) {
    console.error('Error updating calendar entry:', error);
    // Don't throw error, just log it so it doesn't break the main flow
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
  
  // Appointment Details Modal state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');
  
  // Success Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
              addOns: addOns,
              services: services,
              paymentMethod: data.paymentMethod || '',
              note: data.note || '',
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
            // Check for time overlap between existing and new appointment
            const existingDateTime = parseAppointmentDateTime(
              data.timeSlot?.appointmentDate || '',
              data.timeSlot?.time || ''
            );
            // Convert estCompletion hours to milliseconds for time calculation
            const estCompletionHours = parseFloat(String(data.timeSlot?.estCompletion || '0').replace(/[^\d.]/g, '')) || 0;
            const existingEndTime = new Date(existingDateTime.getTime() + estCompletionHours * 60 * 60 * 1000);

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
                // Parse as local time (stored without timezone)
                const endTime = parseLocalISOString(occupancy.estimatedEndTime);
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

      const acceptedAt = toLocalISOString(new Date());
      // Parse estCompletion: value represents hours (converted from totalEstimatedTime in booking flow)
      const estCompletionStr = (bookingToAccept.timeSlot as any)?.estCompletion || '0';
      const estCompletionHours = typeof estCompletionStr === 'number' 
        ? estCompletionStr 
        : parseFloat(String(estCompletionStr).replace(/[^\d.]/g, '')) || 0;
      
      const appointmentDateTime = parseAppointmentDateTime(
        bookingToAccept.timeSlot.appointmentDate,
        bookingToAccept.timeSlot.time
      );
      
      // Calculate end time by adding estimated completion hours (convert hours to milliseconds)
      const estimatedEndTime = new Date(appointmentDateTime.getTime() + estCompletionHours * 60 * 60 * 1000);

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

      // Find and update in ReservationsByUser, also fetch customer name
      const reservationsByUserRef = ref(db, 'Reservations/ReservationsByUser');
      const usersSnapshot = await get(reservationsByUserRef);
      
      const updatePromises: Promise<void>[] = [];
      let customerName = 'Customer';
      
      if (usersSnapshot.exists()) {
        for (const userId in usersSnapshot.val()) {
          const userSnap = usersSnapshot.val()[userId];
          if (userSnap) {
            for (const dateKey in userSnap) {
              const dateSnap = userSnap[dateKey];
              if (dateSnap) {
                for (const bookingKey in dateSnap) {
                  const bookingData = dateSnap[bookingKey];
                  if (bookingData && bookingData.appointmentId === bookingToAccept.appointmentId) {
                    // Fetch customer name
                    try {
                      const userInfoSnapshot = await get(ref(db, `users/${userId}`));
                      if (userInfoSnapshot.exists()) {
                        const userInfo = userInfoSnapshot.val();
                        const firstName = userInfo.firstName || '';
                        const lastName = userInfo.lastName || '';
                        customerName = `${firstName} ${lastName}`.trim() || 'Customer';
                      }
                    } catch (error) {
                      console.error('Error fetching customer name:', error);
                    }
                    
                    const userBookingRef = ref(
                      db,
                      `Reservations/ReservationsByUser/${userId}/${dateKey}/${bookingKey}`
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
                }
              }
            }
          }
        }
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
        // Stores estimated end time when bay becomes available (local time, no UTC conversion)
        occupiedUntil: toLocalISOString(estimatedEndTime),
        lastUpdated: toLocalISOString(new Date()),
      });

      // Create bay occupancy record
      const bayOccupancyRef = ref(
        db,
        `Branches/${branchId}/BayOccupancy/${bookingToAccept.dateKey}/${bookingToAccept.appointmentId}`
      );
      const startTimeValue = toLocalISOString(appointmentDateTime);
      const estimatedEndTimeValue = toLocalISOString(estimatedEndTime);
      await set(bayOccupancyRef, {
        bayNumber: selectedBay,
        appointmentId: bookingToAccept.appointmentId,
        // Appointment times stored as local time values (no UTC conversion)
        startTime: startTimeValue,
        estimatedEndTime: estimatedEndTimeValue,
        status: 'ongoing',
        assignedBy: adminUserId,
        acceptedAt: acceptedAt,
      });

      // Format date for display
      const formattedDate = formatDateForDisplay(bookingToAccept.timeSlot.appointmentDate);
      const formattedTime = bookingToAccept.timeSlot.time;
      const vehiclePlate = bookingToAccept.vehicleDetails.plateNumber || 'N/A';
      
      setSuccessMessage(
        `Appointment for ${customerName} (${vehiclePlate}) on ${formattedDate} at ${formattedTime} has been accepted and assigned to Bay ${selectedBay}.`
      );
      setShowSuccessModal(true);
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
          // Allow re-selecting same bay for same appointment, but block if different appointment
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
      // estCompletion is stored in HOURS, convert to milliseconds
      const estCompletionHours = parseFloat(String((booking.timeSlot as any)?.estCompletion || '0').replace(/[^\d.]/g, '')) || 0;
      const appointmentEndTime = new Date(appointmentDateTime.getTime() + estCompletionHours * 60 * 60 * 1000);

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
      let bayNumber = bookingSnapshot.val()?.bayNumber;

      // If bayNumber not found in booking, try to get it from bayOccupancy
      if (!bayNumber) {
        const bayOccupancyRef = ref(
          db,
          `Branches/${branchId}/BayOccupancy/${bookingToComplete.dateKey}/${bookingToComplete.appointmentId}`
        );
        const occupancySnapshot = await get(bayOccupancyRef);
        if (occupancySnapshot.exists()) {
          bayNumber = occupancySnapshot.val()?.bayNumber;
        }
      }

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
          lastUpdated: toLocalISOString(new Date()),
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
            completedAt: toLocalISOString(new Date()),
          });
        }
      }

      // Update calendar entry
      await updateCalendarEntry(branchId, bookingToComplete, 'completed', bayNumber);

      setSuccessMessage('Appointment completed successfully');
      setShowSuccessModal(true);
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

      // Find and update corresponding booking in ReservationsByUser
      // Iterates through all users to locate matching appointmentId
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
          lastUpdated: toLocalISOString(new Date()),
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
            cancelledAt: toLocalISOString(new Date()),
          });
        }
      }

      // Update calendar entry
      await updateCalendarEntry(branchId, bookingToCancel, 'cancelled', bayNumber);

      setSuccessMessage(`Appointment cancelled successfully. Reason: "${selectedCancelReason}"`);
      setShowSuccessModal(true);
      handleCancelModalClose();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment');
    }
  };

  const handleViewMore = async (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
    
    // Fetch customer name from appointmentId
    try {
      const reservationsByUserRef = ref(db, 'Reservations/ReservationsByUser');
      const usersSnapshot = await get(reservationsByUserRef);
      
      if (usersSnapshot.exists()) {
        for (const userId in usersSnapshot.val()) {
          const userSnap = usersSnapshot.val()[userId];
          if (userSnap) {
            for (const dateKey in userSnap) {
              const dateSnap = userSnap[dateKey];
              if (dateSnap) {
                for (const bookingKey in dateSnap) {
                  const bookingData = dateSnap[bookingKey];
                  if (bookingData && bookingData.appointmentId === booking.appointmentId) {
                    // Found the user, fetch their name
                    const userInfoSnapshot = await get(ref(db, `users/${userId}`));
                    if (userInfoSnapshot.exists()) {
                      const userInfo = userInfoSnapshot.val();
                      const firstName = userInfo.firstName || '';
                      const lastName = userInfo.lastName || '';
                      setCustomerName(`${firstName} ${lastName}`.trim() || 'Customer');
                      return;
                    }
                  }
                }
              }
            }
          }
        }
      }
      setCustomerName('Customer');
    } catch (error) {
      console.error('Error fetching customer name:', error);
      setCustomerName('Customer');
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedBooking(null);
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

      {/* Appointment Details Modal */}
      {selectedBooking && (
        <AppointmentDetailsModal
          visible={showDetailsModal}
          branchName={selectedBooking.branchName}
          branchAddress={selectedBooking.branchAddress}
          branchImage={require('../../../../assets/images/samplebranch.png')}
          customerName={customerName}
          vehicleName={selectedBooking.vehicleDetails.vehicleName}
          plateNumber={selectedBooking.vehicleDetails.plateNumber}
          classification={selectedBooking.vehicleDetails.classification}
          date={selectedBooking.timeSlot.appointmentDate}
          time={selectedBooking.timeSlot.time}
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
          amountDue={`₱${selectedBooking.amountDue.toFixed(2)}`}
          paymentMethod={selectedBooking.paymentMethod || ''}
          estimatedCompletion={
            selectedBooking.timeSlot.estCompletion
              ? typeof selectedBooking.timeSlot.estCompletion === "number"
                ? `${selectedBooking.timeSlot.estCompletion} Hours`
                : selectedBooking.timeSlot.estCompletion
              : undefined
          }
          note={selectedBooking.note}
          onClose={handleCloseDetailsModal}
        />
      )}

      {/* Branded Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </View>
  );
}

