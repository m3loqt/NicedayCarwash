import { ListSkeleton } from '@/components/ui/admin/AdminScreenSkeleton';
import { SelectBayModal, type Bay } from '@/components/ui/admin/dashboard';
import AppointmentDetailsModal from '@/components/ui/user/history/modals/AppointmentDetailsModal';
import { auth, db } from '@/firebase/firebase';
import { useAlert } from '@/hooks/use-alert';
import { get, onValue, push, ref, set, update } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import AppointmentCard from './AppointmentCard';
import CancelReasonModal, { CancelReason } from './CancelReasonModal';
import CompleteConfirmationModal from './CompleteConfirmationModal';
import SuccessModal from './SuccessModal';

interface Booking {
  appointmentId: string;
  branchName: string;
  branchAddress: string;
  status: 'pending' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
  isPaid?: boolean;
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
  cancelledAt?: string;
  completedAt?: string;
  userId?: string;
}

interface AppointmentsListProps {
  activeTab: string;
  searchQuery: string;
}

// Converts date from MM-DD-YYYY format to "December 6, 2025" format
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

// Parses appointment date (MM-DD-YYYY) and time into a Date object.
// Handles: "8:00 AM", "11:00 PM", "8:00", "08:00", "8" (hour only), or empty string.
const parseAppointmentDateTime = (appointmentDate: string, time: string): Date => {
  try {
    const [month, day, year] = (appointmentDate || '').split('-').map(Number);
    if (!month || !day || !year) return new Date();

    let hours = 0;
    let minutes = 0;

    if (time) {
      // "8:00 AM" / "11:00 PM"
      const ampmMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (ampmMatch) {
        hours = parseInt(ampmMatch[1], 10);
        minutes = parseInt(ampmMatch[2], 10);
        const meridiem = ampmMatch[3].toUpperCase();
        if (meridiem === 'PM' && hours !== 12) hours += 12;
        else if (meridiem === 'AM' && hours === 12) hours = 0;
      } else {
        // "8:00" or "08:00" (no meridiem — treat as 24-hour)
        const colonMatch = time.match(/(\d{1,2}):(\d{2})/);
        if (colonMatch) {
          hours = parseInt(colonMatch[1], 10);
          minutes = parseInt(colonMatch[2], 10);
        } else {
          // "8" or "11" — bare hour number
          const numMatch = time.match(/^(\d{1,2})$/);
          if (numMatch) hours = parseInt(numMatch[1], 10);
        }
      }
    }

    return new Date(year, month - 1, day, hours, minutes);
  } catch {
    return new Date();
  }
};

/**
 * Converts a Date object to ISO string format preserving local time values
 * Extracts local time components and formats as YYYY-MM-DDTHH:mm:ss.SSS (no timezone suffix)
 * Used to store appointment times without UTC conversion
 */
const toLocalISOString = (date: Date): string => {
  // Extracting local timezone components from Date object
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-11 -> 1-12
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  
  // Formatting components as zero-padded strings
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  const msStr = String(milliseconds).padStart(3, '0');
  
  // Returning ISO-like string without timezone suffix (no 'Z')
  return `${year}-${monthStr}-${dayStr}T${hoursStr}:${minutesStr}:${secondsStr}.${msStr}`;
};

/**
 * Parses an ISO string (without timezone) back to a Date object
 * Interprets the time components as local time, not UTC
 */
const parseLocalISOString = (isoString: string): Date => {
  if (!isoString) return new Date();
  // Removing timezone indicators ('Z' or offset) to parse as local time
  const cleanString = isoString.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
  const [datePart, timePart] = cleanString.split('T');
  if (!datePart || !timePart) return new Date(isoString); // Falling back to standard parsing
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [time, ms] = timePart.split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  const milliseconds = ms ? parseInt(ms, 10) : 0;
  
  // Creating date in local timezone
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
  // Returning number if timeString is already just a number
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
    // Returning as-is if already has "Bay" prefix, otherwise adding prefix
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
  bayNumber?: number | string,
  timestamp?: string
) => {
  try {
    const calendarDate = convertDateToCalendarFormat(booking.timeSlot.appointmentDate);
    const timeSlot = extractTimeSlotHour(booking.timeSlot.time);
    const estCompletion = String(booking.timeSlot.estCompletion || '');
    const plateNumber = booking.vehicleDetails.plateNumber || '';
    const vehicleClassification = booking.vehicleDetails.classification || '';
    const formattedBayNumber = formatBayNumberForCalendar(bayNumber);
    const userId = booking.userId || await findUserIdForAppointment(booking.appointmentId);

    const calendarRef = ref(
      db,
      `Calendar/${branchId}/${calendarDate}/${booking.appointmentId}`
    );

    const calendarData: any = {
      appointmentId: booking.appointmentId,
      bayNumber: formattedBayNumber,
      estCompletion: estCompletion,
      plateNumber: plateNumber,
      status: status,
      timeSlot: timeSlot,
      userId: userId,
      vehicleClassification: vehicleClassification,
    };

    // Adding timestamp based on status
    if (status === 'completed' && timestamp) {
      calendarData.completedAt = timestamp;
    } else if (status === 'cancelled' && timestamp) {
      calendarData.cancelledAt = timestamp;
    }

    await set(calendarRef, calendarData);
  } catch (error) {
    console.error('Error updating calendar entry:', error);
    // Logging error without throwing to prevent breaking main flow
  }
};

/**
 * Updates services availability based on booking status
 */
const updateServicesAvailability = async (
  branchId: string,
  booking: Booking,
  isAvailable: boolean
) => {
  try {
    if (!booking.services || !Array.isArray(booking.services)) return;

    const servicesRef = ref(db, `Branches/${branchId}/Services`);
    const servicesSnapshot = await get(servicesRef);

    if (!servicesSnapshot.exists()) return;

    const updates: any = {};
    servicesSnapshot.forEach((serviceSnap) => {
      const serviceData = serviceSnap.val();
      const serviceName = serviceData.name;
      
      // Checking if this service is in the booking
      const isInBooking = booking.services!.some(
        (s: any) => s.name === serviceName || serviceSnap.key === s.name
      );

      if (isInBooking) {
        updates[`${serviceSnap.key}/isAvailable`] = isAvailable;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(servicesRef, updates);
    }
  } catch (error) {
    console.error('Error updating services availability:', error);
    // Logging error without throwing to prevent breaking main flow
  }
};

/**
 * Updates add-ons availability based on booking status
 */
const updateAddonsAvailability = async (
  branchId: string,
  booking: Booking,
  isAvailable: boolean
) => {
  try {
    if (!booking.addOns || !Array.isArray(booking.addOns)) return;

    const addonsRef = ref(db, `Branches/${branchId}/AddOns`);
    const addonsSnapshot = await get(addonsRef);

    if (!addonsSnapshot.exists()) return;

    const updates: any = {};
    addonsSnapshot.forEach((addonSnap) => {
      const addonData = addonSnap.val();
      const addonName = addonData.name;
      
      // Checking if this add-on is in the booking
      const isInBooking = booking.addOns!.some(
        (a: any) => a.name === addonName || addonSnap.key === a.name
      );

      if (isInBooking) {
        updates[`${addonSnap.key}/isAvailable`] = isAvailable;
      }
    });

    if (Object.keys(updates).length > 0) {
      await update(addonsRef, updates);
    }
  } catch (error) {
    console.error('Error updating add-ons availability:', error);
    // Logging error without throwing to prevent breaking main flow
  }
};

/**
 * Updates time slot status based on booking status
 */
const updateTimeSlotStatus = async (
  branchId: string,
  booking: Booking,
  status: 'available' | 'unavailable'
) => {
  try {
    if (!booking.timeSlot || !booking.timeSlot.time) return;

    const timeSlotsRef = ref(db, `Branches/${branchId}/TimeSlots`);
    const timeSlotsSnapshot = await get(timeSlotsRef);

    if (!timeSlotsSnapshot.exists()) return;

    const timeSlotsData = timeSlotsSnapshot.val();
    const targetTime = booking.timeSlot.time;

    if (Array.isArray(timeSlotsData)) {
      // Finding the index of the matching time slot
      const slotIndex = timeSlotsData.findIndex(
        (slot: any) => slot && slot.time === targetTime
      );

      if (slotIndex !== -1) {
        const updates: any = {};
        updates[`${slotIndex}/status`] = status;
        await update(timeSlotsRef, updates);
      }
    } else if (typeof timeSlotsData === 'object' && timeSlotsData !== null) {
      // Processing object format
      Object.keys(timeSlotsData).forEach((key) => {
        const slot = timeSlotsData[key];
        if (slot && slot.time === targetTime) {
          const slotRef = ref(db, `Branches/${branchId}/TimeSlots/${key}`);
          update(slotRef, { ...slot, status });
        }
      });
    }
  } catch (error) {
    console.error('Error updating time slot status:', error);
    // Logging error without throwing to prevent breaking main flow
  }
};

/**
 * Updates bay status based on booking status
 */
const updateBayStatus = async (
  branchId: string,
  bayNumber: number | string | null | undefined,
  status: 'available' | 'unavailable'
) => {
  try {
    if (!bayNumber) return;

    const baysRef = ref(db, `Branches/${branchId}/Bays`);
    const baysSnapshot = await get(baysRef);

    if (!baysSnapshot.exists()) return;

    const baysData = baysSnapshot.val();
    const bayNum = typeof bayNumber === 'string' ? parseInt(bayNumber, 10) : bayNumber;

    if (Array.isArray(baysData)) {
      // Finding the bay at the index matching bayNumber (array format: [null, {status: "available"}, ...])
      if (bayNum > 0 && bayNum < baysData.length) {
        const bay = baysData[bayNum];
        if (bay && bay !== null) {
          const updates: any = {};
          updates[`${bayNum}/status`] = status;
          await update(baysRef, updates);
        }
      }
    } else if (typeof baysData === 'object' && baysData !== null) {
      // Processing object format: { "1": {status: "available"}, "2": {status: "unavailable"}, ... }
      const bayKey = String(bayNum);
      if (baysData[bayKey]) {
        const bayRef = ref(db, `Branches/${branchId}/Bays/${bayKey}`);
        const baySnapshot = await get(bayRef);
        if (baySnapshot.exists()) {
          const bayData = baySnapshot.val();
          await update(bayRef, { ...bayData, status });
        }
      }
    }
  } catch (error) {
    console.error('Error updating bay status:', error);
    // Logging error without throwing to prevent breaking main flow
  }
};

export default function AppointmentsList({ activeTab, searchQuery }: AppointmentsListProps) {
  const { alert, AlertComponent } = useAlert();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<CancelReason | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  // const [bookingToOngoing, setBookingToOngoing] = useState<Booking | null>(null);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [bookingToComplete, setBookingToComplete] = useState<Booking | null>(null);
  
  // State for Select Bay Modal
  const [isSelectBayModalVisible, setIsSelectBayModalVisible] = useState(false);
  const [bookingToAccept, setBookingToAccept] = useState<Booking | null>(null);
  const [selectedBay, setSelectedBay] = useState<number | null>(null);
  const [bays, setBays] = useState<Bay[]>([]);
  const [loadingBays, setLoadingBays] = useState(false);
  
  // State for Appointment Details Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');
  
  // State for Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // State for Time Slot Unavailable bottom sheet
  const [showTimeSlotSheet, setShowTimeSlotSheet] = useState(false);
  const [blockedTimeSlot, setBlockedTimeSlot] = useState('');
  const timeSlotSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  const openTimeSlotSheet = (time: string) => {
    setBlockedTimeSlot(time);
    timeSlotSlideAnim.setValue(Dimensions.get('window').height);
    setShowTimeSlotSheet(true);
    requestAnimationFrame(() => {
      Animated.spring(timeSlotSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
      }).start();
    });
  };

  const closeTimeSlotSheet = () => {
    Animated.timing(timeSlotSlideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 240,
      useNativeDriver: true,
    }).start(() => setShowTimeSlotSheet(false));
  };

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

            await autoStartTodayBookings(adminBranchId);
            await autoDeclineExpiredPendingBookings(adminBranchId);
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
            // Converting addOns to array format (handles null, array, or object with numeric keys)
            const addOnsObj = data.addOns;
            let addOns: any[] = [];
            if (Array.isArray(addOnsObj)) {
              addOns = addOnsObj;
            } else if (addOnsObj && typeof addOnsObj === 'object') {
              addOns = Object.keys(addOnsObj).map((k) => addOnsObj[k]);
            }

            // Converting services to array format (handles null, array, or object with numeric keys)
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
              isPaid: data.isPaid !== undefined ? data.isPaid : false,
              timeSlot: data.timeSlot || { appointmentDate: '', time: '', estCompletion: undefined },
              vehicleDetails: data.vehicleDetails || {
                vehicleName: '',
                plateNumber: '',
                classification: '',
              },
              amountDue: data.amountDue || 0,
              key: bookingSnap.key || '',
              dateKey: dateKey,
              cancelledAt: data.cancelledAt || undefined,
              completedAt: data.completedAt || undefined,
              addOns: addOns,
              services: services,
              paymentMethod: data.paymentMethod || '',
              note: data.note || '',
              userId: data.userId || undefined,
            };

            // Filtering by active tab
            // Pending bookings are now sourced from Notifications/ByBranch pendingBookings (separate useEffect)
            const statusMatchesTab =
              (activeTab === 'confirmed' && booking.status === 'accepted') ||
              (activeTab === 'ongoing' && booking.status === 'ongoing') ||
              (activeTab === 'completed' && booking.status === 'completed') ||
              (activeTab === 'cancelled' && booking.status === 'cancelled');
            
            if (statusMatchesTab) {
              // Filtering by search query
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

      // Sorting by appointment date/time (newest first)
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

  // Separate listener for pending bookings sourced from Notifications/ByBranch pendingBookings
  useEffect(() => {
    if (!branchId || activeTab !== 'pending') return;

    const pendingNotifRef = ref(db, `Notifications/ByBranch/${branchId}/pendingBookings`);

    const unsubscribe = onValue(pendingNotifRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const pendingEntries: Array<{ userId: string; dateKey: string; appointmentId: string }> = [];
      snapshot.forEach((snap) => {
        const data = snap.val();
        if (data && data.userId && data.dateKey && data.appointmentId) {
          pendingEntries.push({ userId: data.userId, dateKey: data.dateKey, appointmentId: data.appointmentId });
        }
      });

      const bookingsList: Booking[] = [];
      const searchLower = searchQuery.toLowerCase();

      for (const entry of pendingEntries) {
        try {
          const userBookingRef = ref(db, `Reservations/ReservationsByUser/${entry.userId}/${entry.dateKey}/${entry.appointmentId}`);
          const bookingSnap = await get(userBookingRef);
          if (!bookingSnap.exists()) continue;

          const data = bookingSnap.val();
          if (!data) continue;

          const addOnsObj = data.addOns;
          let addOns: any[] = [];
          if (Array.isArray(addOnsObj)) {
            addOns = addOnsObj;
          } else if (addOnsObj && typeof addOnsObj === 'object') {
            addOns = Object.keys(addOnsObj).map((k) => addOnsObj[k]);
          }

          const servicesObj = data.services;
          let services: any[] = [];
          if (Array.isArray(servicesObj)) {
            services = servicesObj;
          } else if (servicesObj && typeof servicesObj === 'object') {
            services = Object.keys(servicesObj).map((k) => servicesObj[k]);
          }

          const booking: Booking = {
            appointmentId: data.appointmentId || entry.appointmentId,
            branchName: data.branchName || '',
            branchAddress: data.branchAddress || '',
            status: data.status || 'pending',
            isPaid: data.isPaid !== undefined ? data.isPaid : false,
            timeSlot: data.timeSlot || { appointmentDate: '', time: '', estCompletion: undefined },
            vehicleDetails: data.vehicleDetails || { vehicleName: '', plateNumber: '', classification: '' },
            amountDue: data.amountDue || 0,
            key: entry.appointmentId,
            dateKey: entry.dateKey,
            cancelledAt: data.cancelledAt || undefined,
            completedAt: data.completedAt || undefined,
            addOns,
            services,
            paymentMethod: data.paymentMethod || '',
            note: data.note || '',
            userId: entry.userId,
          };

          if (
            !searchQuery ||
            booking.appointmentId.toLowerCase().includes(searchLower) ||
            booking.vehicleDetails.vehicleName.toLowerCase().includes(searchLower) ||
            booking.vehicleDetails.plateNumber.toLowerCase().includes(searchLower)
          ) {
            bookingsList.push(booking);
          }
        } catch (error) {
          console.error('Error fetching pending booking:', error);
        }
      }

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

  // Fetches bay availability from Firebase, checking for conflicts with ongoing appointments
  const fetchBayAvailability = async (appointmentDate: string, appointmentTime: string) => {
    if (!branchId) return;

    setLoadingBays(true);
    try {
      // Getting all ongoing appointments for this branch to check bay conflicts
      const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);
      const snapshot = await get(bookingsRef);

      const occupiedBays = new Set<number>();
      const appointmentDateTime = parseAppointmentDateTime(appointmentDate, appointmentTime);

      // Checking all ongoing appointments for bay conflicts
      snapshot.forEach((dateSnap) => {
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (data && data.status === 'ongoing' && data.bayNumber) {
            // Checking for time overlap between existing and new appointment
            const existingDateTime = parseAppointmentDateTime(
              data.timeSlot?.appointmentDate || '',
              data.timeSlot?.time || ''
            );
            // Converting estCompletion hours to milliseconds for time calculation
            const estCompletionHours = parseFloat(String(data.timeSlot?.estCompletion || '0').replace(/[^\d.]/g, '')) || 0;
            const existingEndTime = new Date(existingDateTime.getTime() + estCompletionHours * 60 * 60 * 1000);

            // Marking bay as unavailable if appointments overlap
            if (
              appointmentDateTime < existingEndTime &&
              appointmentDateTime >= existingDateTime
            ) {
              occupiedBays.add(data.bayNumber);
            }
          }
        });
      });

      // Also checking BayOccupancy records for real-time status
      const bayOccupancyRef = ref(db, `Branches/${branchId}/BayOccupancy`);
      const occupancySnapshot = await get(bayOccupancyRef);
      
      if (occupancySnapshot.exists()) {
        occupancySnapshot.forEach((dateSnap) => {
          dateSnap.forEach((occupancySnap) => {
            const occupancy = occupancySnap.val();
            if (occupancy && occupancy.status === 'ongoing' && occupancy.bayNumber) {
              // Checking if occupancy overlaps
              if (occupancy.estimatedEndTime) {
                // Parsing as local time (stored without timezone)
                const endTime = parseLocalISOString(occupancy.estimatedEndTime);
                if (appointmentDateTime < endTime) {
                  occupiedBays.add(occupancy.bayNumber);
                }
              }
            }
          });
        });
      }

      // Fetching all bays from database
      const baysRef = ref(db, `Branches/${branchId}/Bays`);
      const baysSnapshot = await get(baysRef);
      const bayList: Bay[] = [];

      if (baysSnapshot.exists()) {
        // Processing all bays from database
        baysSnapshot.forEach((baySnap) => {
          const bayNumber = parseInt(baySnap.key || '0', 10);
          if (bayNumber > 0) {
            const bayData = baySnap.val();
            let bayStatus: 'available' | 'unavailable' = 'available';

            // Admin-set unavailability (maintenance OR manually toggled off with no active booking)
            const adminBlocked =
              bayData.status === 'maintenance' ||
              (bayData.status === 'unavailable' && !bayData.currentAppointmentId);
            if (adminBlocked || occupiedBays.has(bayNumber)) {
              bayStatus = 'unavailable';
            }

            bayList.push({ number: bayNumber, status: bayStatus });
          }
        });

        // Sorting bays by number
        bayList.sort((a, b) => a.number - b.number);
      }

      // Setting empty list if no bays exist in database
      setBays(bayList);
    } catch (error) {
      console.error('Error fetching bay availability:', error);
      // Attempting to get list of bays from database without conflict checking
      try {
        const baysRef = ref(db, `Branches/${branchId}/Bays`);
        const baysSnapshot = await get(baysRef);
        const bayList: Bay[] = [];

        if (baysSnapshot.exists()) {
          const baysData = baysSnapshot.val();
          
          // Handle array format: [null, {status: "available"}, {status: "unavailable"}, ...]
          if (Array.isArray(baysData)) {
            baysData.forEach((bay: any, index: number) => {
              if (bay && bay !== null) {
                const bayNumber = bay.id || index;
                const adminBlocked = bay.status === 'maintenance' ||
                  (bay.status === 'unavailable' && !bay.currentAppointmentId);
                const bayStatus: 'available' | 'unavailable' = adminBlocked ? 'unavailable' : 'available';
                bayList.push({ number: bayNumber, status: bayStatus });
              }
            });
          } else if (typeof baysData === 'object' && baysData !== null) {
            // Handle object format: { "1": {status: "available"}, "2": {status: "unavailable"}, ... }
            baysSnapshot.forEach((baySnap) => {
              const bayNumber = parseInt(baySnap.key || '0', 10);
              if (bayNumber > 0) {
                const bayData = baySnap.val();
                const adminBlocked = bayData.status === 'maintenance' ||
                  (bayData.status === 'unavailable' && !bayData.currentAppointmentId);
                const bayStatus: 'available' | 'unavailable' = adminBlocked ? 'unavailable' : 'available';
                bayList.push({ number: bayNumber, status: bayStatus });
              }
            });
          }
          
          bayList.sort((a, b) => a.number - b.number);
        }
        setBays(bayList);
      } catch (fallbackError) {
        console.error('Error in fallback bay fetch:', fallbackError);
        // Setting empty list if fallback also fails
        setBays([]);
      }
    } finally {
      setLoadingBays(false);
    }
  };

  const isSameDay = (dateString: string) => {
  const [month, day, year] = dateString.split('-').map(Number);

  const bookingDate = new Date(year, month - 1, day);
  const today = new Date();

  return (
    bookingDate.getFullYear() === today.getFullYear() &&
    bookingDate.getMonth() === today.getMonth() &&
    bookingDate.getDate() === today.getDate()
  );
};

  const handleAccept = async (booking: Booking) => {
    if (!branchId) return;

    try {
      // Validating that services/addons/time slots are still available
      const servicesRef = ref(db, `Branches/${branchId}/Services`);
      const addonsRef = ref(db, `Branches/${branchId}/AddOns`);
      const timeSlotsRef = ref(db, `Branches/${branchId}/TimeSlots`);

      const [servicesSnapshot, addonsSnapshot, timeSlotsSnapshot] = await Promise.all([
        get(servicesRef),
        get(addonsRef),
        get(timeSlotsRef),
      ]);

      // Checking services availability
      if (booking.services && Array.isArray(booking.services)) {
        const unavailableServices: string[] = [];
        booking.services.forEach((service: any) => {
          if (servicesSnapshot.exists()) {
            servicesSnapshot.forEach((serviceSnap) => {
              if (serviceSnap.key === service.name || serviceSnap.val().name === service.name) {
                const serviceData = serviceSnap.val();
                if (serviceData.isAvailable === false) {
                  unavailableServices.push(service.name || serviceData.name);
                }
              }
            });
          }
        });
        if (unavailableServices.length > 0) {
          alert(
            'Service Unavailable',
            `The following services are no longer available: ${unavailableServices.join(', ')}. Please inform the customer.`
          );
          return;
        }
      }

      // Check addons availability
      if (booking.addOns && Array.isArray(booking.addOns)) {
        const unavailableAddons: string[] = [];
        booking.addOns.forEach((addon: any) => {
          if (addonsSnapshot.exists()) {
            addonsSnapshot.forEach((addonSnap) => {
              if (addonSnap.key === addon.name || addonSnap.val().name === addon.name) {
                const addonData = addonSnap.val();
                if (addonData.isAvailable === false) {
                  unavailableAddons.push(addon.name || addonData.name);
                }
              }
            });
          }
        });
        if (unavailableAddons.length > 0) {
          alert(
            'Add-on Unavailable',
            `The following add-ons are no longer available: ${unavailableAddons.join(', ')}. Please inform the customer.`
          );
          return;
        }
      }

      // Checking time slot availability — only block if admin explicitly set it to unavailable
      if (booking.timeSlot && booking.timeSlot.time) {
        let timeSlotBlockedByAdmin = false;
        if (timeSlotsSnapshot.exists()) {
          const timeSlotsData = timeSlotsSnapshot.val();
          const slots: any[] = Array.isArray(timeSlotsData)
            ? timeSlotsData
            : Object.values(timeSlotsData);
          const matchingSlot = slots.find(
            (slot: any) => slot && slot.time === booking.timeSlot.time
          );
          // Only block if the slot is explicitly marked unavailable by admin
          // (not because of a booking — bookings no longer change slot status)
          if (matchingSlot && matchingSlot.status === 'unavailable') {
            timeSlotBlockedByAdmin = true;
          }
        }
        if (timeSlotBlockedByAdmin) {
          openTimeSlotSheet(booking.timeSlot.time);
          return;
        }
      }

          // Determine if appointment is today
      const shouldStartImmediately = isSameDay(booking.timeSlot.appointmentDate);

    // Set booking status based on date
      const updatedBooking: Booking = {
        ...booking,
        status: shouldStartImmediately ? 'ongoing' : 'accepted',
      };

      setBookingToAccept(updatedBooking);
      setSelectedBay(null);
      // Fetching real-time bay availability before showing modal
      await fetchBayAvailability(booking.timeSlot.appointmentDate, booking.timeSlot.time);
      setIsSelectBayModalVisible(true);
    } catch (error) {
      console.error('Error validating booking availability:', error);
      alert('Error', 'Failed to validate booking availability. Please try again.');
    }
  };

  const autoStartTodayBookings = async (branchId: string) => {
  try {
    const bookingsRef = ref(db, `Reservations/ReservationsByBranch/${branchId}`);
    const snapshot = await get(bookingsRef);

    if (!snapshot.exists()) return;

    const today = new Date();

    snapshot.forEach((dateSnap) => {
      const dateKey = dateSnap.key;

      dateSnap.forEach((bookingSnap) => {
        const booking = bookingSnap.val();

        if (!booking) return;

        if (booking.status === 'accepted') {
          const [month, day, year] = booking.timeSlot?.appointmentDate
            ?.split('-')
            .map(Number);

          const bookingDate = new Date(year, month - 1, day);

          const isToday =
            bookingDate.getFullYear() === today.getFullYear() &&
            bookingDate.getMonth() === today.getMonth() &&
            bookingDate.getDate() === today.getDate();

          if (isToday) {
            const bookingRef = ref(
              db,
              `Reservations/ReservationsByBranch/${branchId}/${dateKey}/${bookingSnap.key}`
            );

            update(bookingRef, {
              status: 'ongoing',
              startedAt: toLocalISOString(new Date()),
            });
          }
        }
      });
    });
  } catch (error) {
    console.error('Auto start booking check failed:', error);
  }
};

  const autoDeclineExpiredPendingBookings = async (branchId: string) => {
    try {
      const pendingRef = ref(db, `Notifications/ByBranch/${branchId}/pendingBookings`);
      const snapshot = await get(pendingRef);
      if (!snapshot.exists()) return;

      const now = new Date();
      const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
      const AUTO_CANCEL_REASON = 'Branch might be too busy to accommodate your request at this time.';
      const cancelledAtTimestamp = toLocalISOString(now);

      const expiredEntries: Array<{ userId: string; dateKey: string; appointmentId: string }> = [];

      snapshot.forEach((snap) => {
        const data = snap.val();
        if (!data || !data.createdAt) return;
        const createdAt = new Date(data.createdAt);
        if (now.getTime() - createdAt.getTime() > TWENTY_FOUR_HOURS_MS) {
          expiredEntries.push({
            userId: data.userId,
            dateKey: data.dateKey,
            appointmentId: data.appointmentId,
          });
        }
      });

      for (const expired of expiredEntries) {
        const { userId, dateKey, appointmentId } = expired;

        // Get full booking from ReservationsByUser
        const userBookingRef = ref(db, `Reservations/ReservationsByUser/${userId}/${dateKey}/${appointmentId}`);
        const bookingSnap = await get(userBookingRef);
        const bookingData = bookingSnap.val();

        // Update user booking to cancelled
        await update(userBookingRef, {
          status: 'cancelled',
          cancelReason: AUTO_CANCEL_REASON,
          cancelledAt: cancelledAtTimestamp,
          cancelledBy: 'system',
        });

        // Write cancelled booking to ReservationsByBranch so it shows in cancelled tab
        if (bookingData) {
          const branchBookingRef = ref(db, `Reservations/ReservationsByBranch/${branchId}/${dateKey}/${appointmentId}`);
          await set(branchBookingRef, {
            ...bookingData,
            status: 'cancelled',
            cancelReason: AUTO_CANCEL_REASON,
            cancelledAt: cancelledAtTimestamp,
            cancelledBy: 'system',
          });
        }

        // Notify user (written to ByBranch since admin can't write to ByUser)
        await push(ref(db, `Notifications/ByBranch/${branchId}/userNotifications/${userId}`), {
          title: 'Booking Automatically Cancelled',
          body: `Your appointment (${appointmentId}) was automatically cancelled. ${AUTO_CANCEL_REASON}`,
          appointmentId,
          type: 'cancelled',
          read: false,
          createdAt: cancelledAtTimestamp,
        });

        // Remove from pending bookings
        await set(ref(db, `Notifications/ByBranch/${branchId}/pendingBookings/${appointmentId}`), null);
      }
    } catch (error) {
      console.error('Auto decline expired pending bookings failed:', error);
    }
  };

  const handleBaySelect = (bayNumber: number) => {
    setSelectedBay(bayNumber);
  };

  const handleFinishBaySelection = async () => {
    if (!selectedBay || !bookingToAccept || !branchId) return;

    const adminUserId = auth.currentUser?.uid;
    if (!adminUserId) {
      alert('Error', 'Admin user not found');
      return;
    }

    try {
      // Checking for conflicts one more time before assigning
      const conflictCheck = await checkBayConflict(selectedBay, bookingToAccept);
      if (conflictCheck.hasConflict) {
        alert(
          'Bay Unavailable',
          conflictCheck.reason || 'This bay is no longer available. Please select another bay.'
        );
        // Refreshing bay availability
        await fetchBayAvailability(
          bookingToAccept.timeSlot.appointmentDate,
          bookingToAccept.timeSlot.time
        );
        return;
      }

      const acceptedAt = toLocalISOString(new Date());
      // Parsing estCompletion: value represents hours (converted from totalEstimatedTime in booking flow)
      const estCompletionStr = (bookingToAccept.timeSlot as any)?.estCompletion || '0';
      const estCompletionHours = typeof estCompletionStr === 'number' 
        ? estCompletionStr 
        : parseFloat(String(estCompletionStr).replace(/[^\d.]/g, '')) || 0;
      
      const appointmentDateTime = parseAppointmentDateTime(
        bookingToAccept.timeSlot.appointmentDate,
        bookingToAccept.timeSlot.time
      );
      
      // Calculating end time by adding estimated completion hours (converting hours to milliseconds)
      const estimatedEndTime = new Date(appointmentDateTime.getTime() + estCompletionHours * 60 * 60 * 1000);

      // Fetching full booking from ReservationsByUser to write to ReservationsByBranch
      const userId = bookingToAccept.userId || '';
      let customerName = 'Customer';
      let fullBookingData: any = null;

      if (userId) {
        const userBookingRef = ref(
          db,
          `Reservations/ReservationsByUser/${userId}/${bookingToAccept.dateKey}/${bookingToAccept.key}`
        );
        const userBookingSnap = await get(userBookingRef);
        fullBookingData = userBookingSnap.val();

        // Fetching customer name
        try {
          const userInfoSnapshot = await get(ref(db, `users/${userId}`));
          if (userInfoSnapshot.exists()) {
            const userInfo = userInfoSnapshot.val();
            customerName = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || 'Customer';
          }
        } catch (error) {
          console.error('Error fetching customer name:', error);
        }
      }

      // Writing full accepted booking to ReservationsByBranch (includes all booking details + userId)
      const branchBookingRef = ref(
        db,
        `Reservations/ReservationsByBranch/${branchId}/${bookingToAccept.dateKey}/${bookingToAccept.key}`
      );
      await set(branchBookingRef, {
        ...(fullBookingData || {}),
        status: 'accepted',
        isPaid: false,
        bayNumber: selectedBay,
        acceptedAt: acceptedAt,
        assignedBy: adminUserId,
        userId,
      });

      // Updating user booking status directly
      if (userId) {
        const userBookingRef = ref(
          db,
          `Reservations/ReservationsByUser/${userId}/${bookingToAccept.dateKey}/${bookingToAccept.key}`
        );
        await update(userBookingRef, {
          status: 'accepted',
          isPaid: false,
          bayNumber: selectedBay,
          acceptedAt: acceptedAt,
          assignedBy: adminUserId,
        });

        // Sending notification to customer
        push(ref(db, `Notifications/ByBranch/${branchId}/userNotifications/${userId}`), {
          title: 'Booking Confirmed',
          body: `Your appointment (${bookingToAccept.appointmentId}) has been confirmed. Bay ${selectedBay} assigned.`,
          appointmentId: bookingToAccept.appointmentId,
          date: bookingToAccept.timeSlot.appointmentDate,
          type: 'accepted',
          read: false,
          createdAt: acceptedAt,
        });
      }

      // Remove from pending bookings notification queue
      await set(ref(db, `Notifications/ByBranch/${branchId}/pendingBookings/${bookingToAccept.appointmentId}`), null);

      // Mark bay as occupied without changing admin-set status
      const bayRef = ref(db, `Branches/${branchId}/Bays/${selectedBay}`);
      await update(bayRef, {
        currentAppointmentId: bookingToAccept.appointmentId,
        occupiedUntil: toLocalISOString(estimatedEndTime),
        lastUpdated: toLocalISOString(new Date()),
      });

      // Creating bay occupancy record
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

      // Time slot status is admin-managed only — not modified by bookings

      // Formatting date for display
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
      alert('Error', 'Failed to accept appointment. Please try again.');
    }
  };

  // Checks if bay has conflicts with existing appointments
  const checkBayConflict = async (bayNumber: number, booking: Booking) => {
    if (!branchId) return { hasConflict: false };

    try {
      // Checking if bay is manually set to maintenance (admin-only block)
      const bayRef = ref(db, `Branches/${branchId}/Bays/${bayNumber}`);
      const baySnapshot = await get(bayRef);
      if (baySnapshot.exists()) {
        const bayData = baySnapshot.val();
        if (bayData.status === 'maintenance') {
          return { hasConflict: true, reason: 'Bay is under maintenance' };
        }
        // Also check admin-set unavailable (manual toggle from Services page)
        if (bayData.status === 'unavailable' && !bayData.currentAppointmentId) {
          return { hasConflict: true, reason: 'Bay is set as unavailable' };
        }
      }

      // Checking for overlapping appointments
      const appointmentDateTime = parseAppointmentDateTime(
        booking.timeSlot.appointmentDate,
        booking.timeSlot.time
      );
      // Converting estCompletion from hours to milliseconds
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

            // Checking for time overlap
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
      // Getting bay number before updating status
      const branchBookingRef = ref(
        db,
        `Reservations/ReservationsByBranch/${branchId}/${bookingToComplete.dateKey}/${bookingToComplete.key}`
      );
      const bookingSnapshot = await get(branchBookingRef);
      let bayNumber = bookingSnapshot.val()?.bayNumber;

      // Trying to get bayNumber from bayOccupancy if not found in booking
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

      // Updating in ReservationsByBranch
      const completedAtTimestamp = toLocalISOString(new Date());
      await update(branchBookingRef, { 
        status: 'completed',
        completedAt: completedAtTimestamp,
      });

      // Updating ReservationsByUser directly using stored userId
      const userId = bookingToComplete.userId || '';
      if (userId) {
        const userBookingRef = ref(
          db,
          `Reservations/ReservationsByUser/${userId}/${bookingToComplete.dateKey}/${bookingToComplete.key}`
        );
        await update(userBookingRef, {
          status: 'completed',
          completedAt: completedAtTimestamp,
        });

        // Sending notification to customer
        push(ref(db, `Notifications/ByBranch/${branchId}/userNotifications/${userId}`), {
          title: 'Car Wash Complete!',
          body: `Your vehicle is clean and ready. Appointment ${bookingToComplete.appointmentId} has been completed.`,
          appointmentId: bookingToComplete.appointmentId,
          date: bookingToComplete.timeSlot.appointmentDate,
          type: 'completed',
          read: false,
          createdAt: completedAtTimestamp,
        });
      }

      // Releasing bay occupancy without changing admin-set status
      if (bayNumber) {
        const bayRef = ref(db, `Branches/${branchId}/Bays/${bayNumber}`);
        await update(bayRef, {
          currentAppointmentId: null,
          occupiedUntil: null,
          lastUpdated: toLocalISOString(new Date()),
        });

        // Updating bay occupancy record
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

      // Updating calendar entry
      await updateCalendarEntry(branchId, bookingToComplete, 'completed', bayNumber, completedAtTimestamp);

      // Time slot status is admin-managed only — not modified by bookings

      setSuccessMessage('Appointment completed successfully');
      setShowSuccessModal(true);
      handleCompleteModalClose();
    } catch (error) {
      console.error('Error completing appointment:', error);
      alert('Error', 'Failed to complete appointment');
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
      // Getting bay number before updating status (only exists if booking was already in ReservationsByBranch)
      const branchBookingRef = ref(
        db,
        `Reservations/ReservationsByBranch/${branchId}/${bookingToCancel.dateKey}/${bookingToCancel.key}`
      );
      const bookingSnapshot = await get(branchBookingRef);
      const bayNumber = bookingSnapshot.val()?.bayNumber;
      const wasPending = !bookingSnapshot.exists();

      // Updating in ReservationsByBranch
      const cancelledAtTimestamp = toLocalISOString(new Date());
      await update(branchBookingRef, {
        status: 'cancelled',
        cancelReason: selectedCancelReason,
        cancelledAt: cancelledAtTimestamp,
      });

      // Updating ReservationsByUser directly using stored userId
      const userId = bookingToCancel.userId || '';
      if (userId) {
        const userBookingRef = ref(
          db,
          `Reservations/ReservationsByUser/${userId}/${bookingToCancel.dateKey}/${bookingToCancel.key}`
        );
        const userBookingSnap = await get(userBookingRef);
        const userBookingData = userBookingSnap.val();

        await update(userBookingRef, {
          status: 'cancelled',
          cancelReason: selectedCancelReason,
          cancelledAt: cancelledAtTimestamp,
        });

        // If booking was pending (not yet in ReservationsByBranch), write full cancelled record now
        if (wasPending && userBookingData) {
          await set(branchBookingRef, {
            ...userBookingData,
            status: 'cancelled',
            cancelReason: selectedCancelReason,
            cancelledAt: cancelledAtTimestamp,
            userId,
          });
        }

        // Sending notification to customer
        push(ref(db, `Notifications/ByBranch/${branchId}/userNotifications/${userId}`), {
          title: 'Booking Cancelled',
          body: `Your appointment (${bookingToCancel.appointmentId}) was cancelled. Reason: ${selectedCancelReason}.`,
          appointmentId: bookingToCancel.appointmentId,
          date: bookingToCancel.timeSlot.appointmentDate,
          type: 'cancelled',
          read: false,
          createdAt: cancelledAtTimestamp,
        });
      }

      // Remove from pending bookings notification queue if it was a pending booking
      if (wasPending) {
        await set(ref(db, `Notifications/ByBranch/${branchId}/pendingBookings/${bookingToCancel.appointmentId}`), null);
      }

      // Releasing bay occupancy without changing admin-set status
      if (bayNumber && bookingSnapshot.val()?.status === 'ongoing') {
        const bayRef = ref(db, `Branches/${branchId}/Bays/${bayNumber}`);
        await update(bayRef, {
          currentAppointmentId: null,
          occupiedUntil: null,
          lastUpdated: toLocalISOString(new Date()),
        });

        // Updating bay occupancy record
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

      // Updating calendar entry
      await updateCalendarEntry(branchId, bookingToCancel, 'cancelled', bayNumber, cancelledAtTimestamp);

      // Time slot status is admin-managed only — not modified by bookings

      setSuccessMessage(`Appointment cancelled successfully. Reason: "${selectedCancelReason}"`);
      setShowSuccessModal(true);
      handleCancelModalClose();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Error', 'Failed to cancel appointment');
    }
  };

  const handleViewMore = async (booking: Booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
    
    // Fetching customer name using stored userId
    try {
      const userId = booking.userId || '';
      if (userId) {
        const userInfoSnapshot = await get(ref(db, `users/${userId}`));
        if (userInfoSnapshot.exists()) {
          const userInfo = userInfoSnapshot.val();
          const firstName = userInfo.firstName || '';
          const lastName = userInfo.lastName || '';
          setCustomerName(`${firstName} ${lastName}`.trim() || 'Customer');
          return;
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
      <View className="flex-1">
        <ListSkeleton rowCount={6} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: 'transparent' }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={{ backgroundColor: 'transparent', flex: 1 }}
        className="pt-4"
        contentContainerStyle={{ paddingBottom: 80, backgroundColor: 'transparent' }}
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
              isPaid={booking.isPaid}
              cancelledAt={booking.cancelledAt}
              completedAt={booking.completedAt}
              onAccept={() => handleAccept(booking)}
              onCancel={() => handleCancel(booking)}
              onComplete={() => handleComplete(booking)}
              onViewMore={() => handleViewMore(booking)}
            />
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-lg text-gray-500 text-center">
              No {activeTab} bookings found
            </Text>
            <Text className="text-sm text-gray-400 text-center mt-2">
              {searchQuery ? 'Try a different search term' : `Your ${activeTab} bookings will appear here`}
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
          status={selectedBooking.status}
          isPaid={selectedBooking.isPaid}
          appointmentId={selectedBooking.appointmentId}
          isAdminView={true}
          onClose={handleCloseDetailsModal}
          onAccept={() => {
            handleCloseDetailsModal();
            handleAccept(selectedBooking);
          }}
          onCancel={() => {
            handleCloseDetailsModal();
            handleCancel(selectedBooking);
          }}
          onComplete={() => {
            handleCloseDetailsModal();
            handleComplete(selectedBooking);
          }}
        />
      )}

      {/* Branded Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      {AlertComponent}

      {/* Time Slot Unavailable bottom sheet */}
      <Modal
        visible={showTimeSlotSheet}
        transparent
        animationType="none"
        onRequestClose={closeTimeSlotSheet}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
            activeOpacity={1}
            onPress={closeTimeSlotSheet}
          />
          <Animated.View
            style={{
              transform: [{ translateY: timeSlotSlideAnim }],
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 36,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 24,
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0' }} />
            </View>

            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
                  Time Slot Unavailable
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeTimeSlotSheet}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 16, color: '#666', fontWeight: '600' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 20, marginBottom: 20 }} />

            {/* Icon + message */}
            <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF3F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 26 }}>🕐</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>
                {blockedTimeSlot} is currently unavailable
              </Text>
              <Text style={{ fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20 }}>
                This time slot has been disabled by the branch. Please inform the customer and reschedule.
              </Text>
            </View>

            {/* Close button */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <TouchableOpacity
                onPress={closeTimeSlotSheet}
                style={{ backgroundColor: '#F9EF08', borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A00' }}>Got it</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

