import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ServiceOrAddon {
  id: string;
  name: string;
  sedan?: number;
  suv?: number;
  pickup?: number;
  price?: number;
  estimatedTime?: number;
}

interface ConfirmationStepProps {
  branch: { id: string; name: string; address?: string; image?: any };
  vehicle: { vname: string; vplateNumber: string; classification?: string; vtype?: string };
  services: ServiceOrAddon[];
  addons: ServiceOrAddon[];
  date: Date | null;
  timeSlot: { time: string } | null;
  totalEstimatedTime: number;
  paymentMethod: string | null;
  onBack?: () => void;
  onDone?: () => void;
}

// Map vtype (ID) to classification name
const getClassificationName = (vtype?: string): string => {
  if (!vtype) return '';
  const classificationMap: { [key: string]: string } = {
    'sedan': 'Sedan',
    'suv': 'SUV',
    'pickup': 'Pickup',
    'motorcycle-small': 'Motorcycle Small',
    'motorcycle-large': 'Motorcycle Large',
  };
  return classificationMap[vtype.toLowerCase()] || vtype;
};

const getVehicleIcon = (vehicleType?: string) => {
  switch (vehicleType?.toLowerCase()) {
    case 'sedan':
      return require('../../../../assets/images/sedan.png');
    case 'suv':
      return require('../../../../assets/images/suv.png');
    case 'pickup':
      return require('../../../../assets/images/pickup.png');
    case 'motorcycle-small':
      return require('../../../../assets/images/motorcycle_small.png');
    case 'motorcycle-large':
      return require('../../../../assets/images/motorcycle_large.png');
    default:
      return require('../../../../assets/images/sedan.png');
  }
};

const getPriceForClassification = (item: ServiceOrAddon, classification?: string): number => {
  if (item.price) return item.price;
  switch (classification?.toLowerCase()) {
    case 'sedan':
      return item.sedan || 0;
    case 'suv':
      return item.suv || 0;
    case 'pickup':
      return item.pickup || 0;
    default:
      return item.sedan || 0;
  }
};

const formatDate = (date: Date): string => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

const formatTimeRange = (timeSlot: { time: string } | null, estimatedHours: number): string => {
  if (!timeSlot) return '';
  const startTime = timeSlot.time;
  // Parse start time and add estimated hours
  const match = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return startTime;
  
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  // Convert to 24-hour format
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  // Add estimated hours
  const endHour = hour + estimatedHours;
  
  // Convert back to 12-hour format
  const endHour12 = endHour > 12 ? endHour - 12 : (endHour === 0 ? 12 : endHour === 12 ? 12 : endHour);
  const endPeriod = endHour >= 12 ? 'pm' : 'am';
  
  const startTimeLower = startTime.toLowerCase();
  return `${startTimeLower} - ${endHour12}:${minute.toString().padStart(2, '0')} ${endPeriod}`;
};

export default function ConfirmationStep({
  branch,
  vehicle,
  services,
  addons,
  date,
  timeSlot,
  totalEstimatedTime,
  paymentMethod,
  onBack,
  onDone,
}: ConfirmationStepProps) {
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');

  const generateAppointmentId = (): string => {
    // Generate 6 random digits
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `ND-${random}`;
  };

  const formatDateForPath = (date: Date): string => {
    // Format as MM-DD-YYYY for database path (matches database structure)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}-${year}`;
  };

  const formatDateForDisplay = (date: Date): string => {
    // Format as MM-DD-YYYY for appointmentDate field (same as database path)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}-${year}`;
  };

  const handleConfirm = async () => {
    if (!date || !timeSlot) {
      Alert.alert('Error', 'Please select a date and time slot');
      return;
    }

    setSubmitting(true);

    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        setSubmitting(false);
        return;
      }

      const db = getDatabase();
      
      // Generate appointment ID (ND-XXXXXX format)
      const appointmentId = generateAppointmentId();
      
      // Format creation date for database path (MM-DD-YYYY) - use current date, not appointment date
      const creationDate = new Date();
      const datePath = formatDateForPath(creationDate);
      
      // Get classification for price calculation (use vtype ID if available, otherwise classification)
      const classificationForPrice = vehicle.vtype || vehicle.classification?.toLowerCase() || '';
      
      // Calculate amount due
      const bookingFee = 25.00;
      const servicesTotal = services.reduce((sum, s) => sum + getPriceForClassification(s, classificationForPrice), 0);
      const addonsTotal = addons.reduce((sum, a) => sum + getPriceForClassification(a, classificationForPrice), 0);
      const amountDue = servicesTotal + addonsTotal + bookingFee;

      // Get classification name for display/storage (convert vtype to name if needed)
      const classification = vehicle.classification || getClassificationName(vehicle.vtype) || '';
      
      // Prepare booking data matching database structure
      const bookingData = {
        appointmentId: appointmentId,
        branchName: branch.name,
        branchAddress: branch.address || '',
        paymentMethod: paymentMethod || '',
        status: 'pending',
        note: note.trim() || '',
        amountDue: amountDue, // Store as number, not string
        timeSlot: {
          time: timeSlot.time,
          appointmentDate: formatDateForDisplay(date),
          available: true,
          estCompletion: String(totalEstimatedTime), // Database shows as string
        },
        vehicleDetails: {
          vehicleName: vehicle.vname || '',
          plateNumber: vehicle.vplateNumber || '',
          classification: classification,
        },
        services: services.map(s => ({
          name: s.name,
          price: getPriceForClassification(s, classificationForPrice),
          estimatedTime: String(s.estimatedTime || 0), // Database shows as string
        })),
        addOns: addons.map(a => ({
          name: a.name,
          price: getPriceForClassification(a, classificationForPrice),
          estimatedTime: String(a.estimatedTime || 0), // Database shows as string
        })),
      };

      // Save to ReservationsByUser/{userId}/{date}/{appointmentId}
      // appointmentId is both the key and included as a field in the data
      const userBookingRef = ref(db, `Reservations/ReservationsByUser/${userId}/${datePath}/${appointmentId}`);
      await set(userBookingRef, bookingData);

      // Also save to ReservationsByBranch/{branchId}/{date}/{appointmentId} for admin access
      const branchBookingRef = ref(db, `Reservations/ReservationsByBranch/${branch.id}/${datePath}/${appointmentId}`);
      await set(branchBookingRef, bookingData);

      setSubmitting(false);
      onDone?.();
      router.replace({
        pathname: '/user/booking-success',
        params: { appointmentId },
      } as any);
    } catch (error) {
      console.error('Failed to save booking:', error);
      Alert.alert('Error', 'Failed to save booking. Please try again.');
      setSubmitting(false);
    }
  };

  const formatPrice = (value: number) => {
    return `₱ ${value.toFixed(2)}`;
  };

  // Use the same classification logic as in handleConfirm for consistency
  const classificationForPrice = vehicle?.vtype || vehicle?.classification?.toLowerCase() || '';
  const bookingFee = 25.00;
  const orderSummary = [
    ...services.map((s) => ({
      label: s.name,
      price: getPriceForClassification(s, classificationForPrice),
    })),
    ...addons.map((a) => ({
      label: a.name,
      price: getPriceForClassification(a, classificationForPrice),
    })),
    {
      label: 'Booking Fee',
      price: bookingFee,
    },
  ];

  const amountDue = orderSummary.reduce((sum, item) => sum + item.price, 0);

  return (
    <View className="flex-1 bg-[#F8F8F8]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}>
        {/* Single White Card Container */}
        <View className="bg-white rounded-2xl mx-4 mb-4">
          {/* Branch Information Section */}
          <View className="p-4">
          <Text className="font-semibold text-[#1E1E1E] mb-2" style={{ fontSize: 20 }}>Branch</Text>
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-3">
              <Text className="font-semibold text-[#1E1E1E] mb-1" style={{ fontSize: 20 }}>{branch?.name}</Text>
              <View className="flex-row items-center">
                <Ionicons name="location" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text className="text-gray-500 flex-1" style={{ fontSize: 16 }}>{branch?.address || 'No address provided'}</Text>
              </View>
            </View>
            {branch?.image && (
              <Image source={branch.image} className="w-20 h-20 rounded-lg" resizeMode="cover" />
            )}
          </View>
          </View>

          {/* Separator Line */}
          <View className="px-4">
            <View className="h-[0.5px] bg-gray-200" />
          </View>

          {/* Vehicle Information Section */}
          <View className="p-4">
          <Text className="font-semibold text-[#1E1E1E] mb-3" style={{ fontSize: 20 }}>Vehicle</Text>
          <View className="flex-row items-center">
            <Image
              source={getVehicleIcon(vehicle?.classification)}
              className="w-10 h-10"
              resizeMode="contain"
              style={{ tintColor: '#F9EF08' }}
            />
            <View className="w-[0.5px] h-10 bg-gray-200 mx-3" />
            <View className="flex-1 flex-row items-center justify-between">
              <Text className="text-gray-500" style={{ fontSize: 16 }}>{vehicle?.vname}</Text>
              <Text className="text-gray-500" style={{ fontSize: 16 }}>{vehicle?.vplateNumber} {vehicle?.classification}</Text>
            </View>
          </View>
          </View>

          {/* Separator Line */}
          {date && (
            <View className="px-4">
              <View className="h-[0.5px] bg-gray-200" />
            </View>
          )}

          {/* Date & Time Section */}
          {date && (
            <View className="p-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="font-semibold text-[#1E1E1E]" style={{ fontSize: 20 }}>Date & Time</Text>
              <Text className="text-gray-500" style={{ fontSize: 16 }}>{formatDate(date)}</Text>
            </View>
            {timeSlot && (
              <View className="items-end">
                <Text className="text-gray-500" style={{ fontSize: 16 }}>{formatTimeRange(timeSlot, totalEstimatedTime)}</Text>
              </View>
            )}
          </View>
          )}

          {/* Separator Line */}
          <View className="px-4">
            <View className="h-[0.5px] bg-gray-200" />
          </View>

          {/* Order Summary Section */}
          <View className="p-4">
          <Text className="font-semibold text-[#1E1E1E] mb-3" style={{ fontSize: 20 }}>Order Summary</Text>
          {orderSummary.map((item, idx) => (
            <View key={idx} className="flex-row justify-between mb-2">
              <Text className="text-gray-500" style={{ fontSize: 16 }}>{item.label}</Text>
              <Text className="text-gray-500" style={{ fontSize: 16 }}>{formatPrice(item.price)}</Text>
            </View>
          ))}
          <View className="h-[0.5px] bg-gray-200 my-3" />
          <View className="flex-row justify-between items-center">
            <Text className="font-semibold text-[#1E1E1E]" style={{ fontSize: 20 }}>Amount Due</Text>
            <Text className="text-gray-500" style={{ fontSize: 16 }}>{formatPrice(amountDue)}</Text>
          </View>
          </View>

          {/* Separator Line */}
          <View className="px-4">
            <View className="h-[0.5px] bg-gray-200" />
          </View>

          {/* Payment Method Section */}
          <View className="p-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-semibold text-[#1E1E1E]" style={{ fontSize: 20 }}>Payment Method</Text>
              <Text className="text-gray-500" style={{ fontSize: 16 }}>{paymentMethod || 'Not selected'}</Text>
            </View>
          </View>

          {/* Separator Line */}
          <View className="px-4">
            <View className="h-[0.5px] bg-gray-200" />
          </View>

          {/* Estimated Time of Completion Section */}
          <View className="p-4">
            <View className="flex-row justify-between items-center">
              <Text className="font-semibold text-[#1E1E1E]" style={{ fontSize: 20 }}>Estimated Time of Completion</Text>
              <Text className="text-gray-500" style={{ fontSize: 16 }}>{totalEstimatedTime} {totalEstimatedTime === 1 ? 'Hour' : 'Hours'}</Text>
            </View>
          </View>

          {/* Separator Line */}
          <View className="px-4">
            <View className="h-[0.5px] bg-gray-200" />
          </View>

          {/* Note to Branch Section */}
          <View className="p-4">
            <Text className="font-semibold text-[#1E1E1E] mb-3" style={{ fontSize: 20 }}>Note to Branch</Text>
            <TextInput
              className="rounded-lg border border-gray-200 p-3 text-[#1E1E1E] min-h-[80px]"
              placeholder="(Ex: I'd like to request a washer)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={note}
              onChangeText={setNote}
              textAlignVertical="top"
              style={{ fontSize: 14 }}
            />
          </View>

          {/* Separator Line */}
          {/* <View className="px-4">
            <View className="h-[0.5px] bg-gray-200" />
          </View> */}

          {/* Disclaimer Section */}
          <View className="pb-4">
            <Text className="font-regular text-[#1E1E1E] mb-1 text-center" style={{ fontSize: 18 }}>Disclaimer</Text>
            <Text className="text-gray-500 italic text-center px-10" style={{ fontSize: 15 }}>
              Final duration of the carwash will depend on the car size and state
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Finish Button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4">
        <TouchableOpacity
          className="bg-[#F9EF08] py-4 rounded-xl items-center justify-center"
          onPress={handleConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#1E1E1E" />
          ) : (
            <Text className="text-white font-semibold text-lg">Finish</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
