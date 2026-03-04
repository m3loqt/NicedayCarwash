import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface BookingData {
  appointmentId: string;
  branchName: string;
  branchAddress: string;
  amountDue: number;
  status: string;
  isPaid?: boolean;
  timeSlot?: {
    appointmentDate: string;
    time: string;
  };
  vehicleDetails?: {
    vehicleName: string;
    plateNumber: string;
    classification: string;
  };
}

export default function PaymentPage() {
  const { alert, AlertComponent } = useAlert();
  const params = useLocalSearchParams();
  const appointmentId = params.appointmentId as string;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [dateKey, setDateKey] = useState<string | null>(null);
  const [bookingKey, setBookingKey] = useState<string | null>(null);

  const db = getDatabase();
  const bookingFee = 25.00;

  useEffect(() => {
    loadBookingData();
  }, [appointmentId]);

  const loadBookingData = async () => {
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        alert('Error', 'User not authenticated');
        router.back();
        return;
      }

      // Finding booking in ReservationsByUser
      const userBookingsRef = ref(db, `Reservations/ReservationsByUser/${userId}`);
      const snapshot = await get(userBookingsRef);

      if (!snapshot.exists()) {
        alert('Error', 'Booking not found');
        router.back();
        return;
      }

      let foundBooking: BookingData | null = null;
      let foundBranchId: string | null = null;
      let foundDateKey: string | null = null;
      let foundBookingKey: string | null = null;

      snapshot.forEach((dateSnap) => {
        const dateKeyValue = dateSnap.key || '';
        dateSnap.forEach((bookingSnap) => {
          const data = bookingSnap.val();
          if (data && data.appointmentId === appointmentId) {
            foundBooking = {
              appointmentId: data.appointmentId || '',
              branchName: data.branchName || '',
              branchAddress: data.branchAddress || '',
              amountDue: data.amountDue || 0,
              status: data.status || 'pending',
              isPaid: data.isPaid !== undefined ? data.isPaid : false,
              timeSlot: data.timeSlot,
              vehicleDetails: data.vehicleDetails,
            };
            foundDateKey = dateKeyValue;
            foundBookingKey = bookingSnap.key || '';
          }
        });
      });

      if (!foundBooking) {
        alert('Error', 'Booking not found');
        router.back();
        return;
      }

      // Finding branch ID from ReservationsByBranch
      const branchBookingsRef = ref(db, 'Reservations/ReservationsByBranch');
      const branchSnapshot = await get(branchBookingsRef);

      if (branchSnapshot.exists()) {
        branchSnapshot.forEach((branchSnap) => {
          const branchIdValue = branchSnap.key || '';
          branchSnap.forEach((dateSnap) => {
            dateSnap.forEach((bookingSnap) => {
              const data = bookingSnap.val();
              if (data && data.appointmentId === appointmentId) {
                foundBranchId = branchIdValue;
              }
            });
          });
        });
      }

      setBooking(foundBooking);
      setBranchId(foundBranchId);
      setDateKey(foundDateKey);
      setBookingKey(foundBookingKey);
      setLoading(false);
    } catch (error) {
      console.error('Error loading booking:', error);
      alert('Error', 'Failed to load booking details');
      router.back();
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      alert('Error', 'Please select a payment method');
      return;
    }

    if (!booking || booking.status !== 'accepted') {
      alert('Error', 'This booking is not eligible for payment');
      return;
    }

    if (booking.isPaid) {
      alert('Error', 'This booking has already been paid');
      return;
    }

    setProcessing(true);

    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId || !branchId || !dateKey || !bookingKey) {
        alert('Error', 'Missing required information');
        setProcessing(false);
        return;
      }

      // Updating ReservationsByUser
      const userBookingRef = ref(
        db,
        `Reservations/ReservationsByUser/${userId}/${dateKey}/${bookingKey}`
      );
      await update(userBookingRef, {
        isPaid: true,
        status: 'ongoing',
      });

      // Updating ReservationsByBranch
      const branchBookingRef = ref(
        db,
        `Reservations/ReservationsByBranch/${branchId}/${dateKey}/${bookingKey}`
      );
      await update(branchBookingRef, {
        isPaid: true,
        status: 'ongoing',
      });

      setProcessing(false);
      alert('Success', 'Payment successful! Your booking is now ongoing.');
      router.back();
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error', 'Failed to process payment. Please try again.');
      setProcessing(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (month < 1 || month > 12) return dateString;
    return `${monthNames[month - 1]} ${day}, ${year}`;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F8F8F8] justify-center items-center">
        <ActivityIndicator size="large" color="#F9EF08" />
        <Text className="text-gray-500 mt-4">Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View className="flex-1 bg-[#F8F8F8] justify-center items-center">
        <Text className="text-gray-500">Booking not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="bg-white border-b border-gray-200" style={{ marginTop: -insets.top }}>
          <View className="flex-row items-center justify-between p-4" style={{ paddingTop: insets.top + 16 }}>
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-white border items-center justify-center"
              style={{ borderColor: 'rgba(179, 179, 179, 0.20)' }}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#B3B3B3" />
            </TouchableOpacity>
            <Text className="text-2xl font-semibold text-[#1E1E1E]">Payment</Text>
            <View className="w-10" />
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}>
          {/* Booking Summary Card */}
          <View className="bg-white rounded-2xl mx-4 mb-4 p-4">
            <Text className="font-semibold text-[#1E1E1E] mb-3" style={{ fontSize: 20 }}>Booking Summary</Text>
            
            <View className="mb-3">
              <Text className="text-xs text-gray-500 mb-1">Appointment ID</Text>
              <Text className="text-sm font-bold text-[#1E1E1E]">{booking.appointmentId}</Text>
            </View>

            <View className="mb-3">
              <Text className="text-xs text-gray-500 mb-1">Branch</Text>
              <Text className="text-sm font-semibold text-[#1E1E1E]">{booking.branchName}</Text>
              <Text className="text-xs text-gray-500">{booking.branchAddress}</Text>
            </View>

            {booking.timeSlot && (
              <View className="mb-3">
                <Text className="text-xs text-gray-500 mb-1">Date & Time</Text>
                <Text className="text-sm text-[#1E1E1E]">
                  {formatDate(booking.timeSlot.appointmentDate)} at {booking.timeSlot.time}
                </Text>
              </View>
            )}

            <View className="h-[0.5px] bg-gray-200 my-3" />

            <View className="flex-row justify-between items-center">
              <Text className="font-semibold text-[#1E1E1E]" style={{ fontSize: 18 }}>Booking Fee</Text>
              <Text className="font-semibold text-[#1E1E1E]" style={{ fontSize: 18 }}>
                ₱{bookingFee.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Payment Methods */}
          <View className="bg-white rounded-2xl mx-4 mb-4 p-4">
            <Text className="font-semibold text-[#1E1E1E] mb-4" style={{ fontSize: 20 }}>Select Payment Method</Text>
            
            {[
              {
                id: 'gcash',
                title: 'GCash',
                desc: 'Pay using your GCash account',
                icon: '📱',
              },
              {
                id: 'paymaya',
                title: 'PayMaya',
                desc: 'Pay using your PayMaya account',
                icon: '💳',
              },
            ].map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedPaymentMethod(method.id)}
                className="bg-gray-50 p-4 rounded-xl mb-3 flex-row items-center border-2"
                style={{
                  borderColor: selectedPaymentMethod === method.id ? '#F9EF08' : 'transparent',
                }}
              >
                <View className="w-12 h-12 rounded-full bg-white items-center justify-center mr-4">
                  <Text className="text-2xl">{method.icon}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-[#1E1E1E]">{method.title}</Text>
                  <Text className="text-sm text-gray-500">{method.desc}</Text>
                </View>
                <View
                  className={`w-6 h-6 rounded-full border-2 ${
                    selectedPaymentMethod === method.id ? 'border-[#F9EF08]' : 'border-gray-300'
                  } items-center justify-center`}
                >
                  {selectedPaymentMethod === method.id && (
                    <View className="w-3.5 h-3.5 rounded-full bg-[#F9EF08]" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Button */}
          <View className="mx-4">
            <TouchableOpacity
              className="bg-[#F9EF08] py-4 rounded-xl items-center justify-center"
              onPress={handlePayment}
              disabled={processing || !selectedPaymentMethod}
              style={{ opacity: processing || !selectedPaymentMethod ? 0.6 : 1 }}
            >
              {processing ? (
                <ActivityIndicator color="#1E1E1E" />
              ) : (
                <Text className="text-[#1E1E1E] font-semibold text-lg">
                  Pay ₱{bookingFee.toFixed(2)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        {AlertComponent}
      </SafeAreaView>
    </View>
  );
}

