import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export interface OrderItem {
  label: string;
  price: string;
}

export interface AppointmentDetailsProps {
  branchName: string;
  branchAddress?: string;
  branchImage?: any; // require(...) or { uri: string }
  customerName?: string;
  vehicleName?: string;
  plateNumber?: string;
  classification?: string;
  date?: string;
  time?: string;
  orderSummary?: OrderItem[];
  amountDue?: string;
  paymentMethod?: string;
  estimatedCompletion?: string;
  note?: string;
  onBack?: () => void;
}

const getVehicleIcon = (vehicleType?: string) => {
  switch (vehicleType?.toLowerCase()) {
    case 'sedan':
      return require('../../../assets/images/sedan.png');
    case 'suv':
      return require('../../../assets/images/suv.png');
    case 'pickup':
      return require('../../../assets/images/pickup.png');
    case 'motorcycle-small':
      return require('../../../assets/images/motorcycle_small.png');
    case 'motorcycle-large':
      return require('../../../assets/images/motorcycle_large.png');
    default:
      return require('../../../assets/images/sedan.png');
  }
};

// Converts date from MM-DD-YYYY to "December 6, 2025" format
const formatDateForDisplay = (dateString?: string): string => {
  if (!dateString) return '';
  // Parsing MM-DD-YYYY format
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString; // Returning as-is if format is unexpected
  
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

const formatTimeRange = (time?: string, estimatedHours?: string | number): string => {
  if (!time) return '';
  if (!estimatedHours) return time;
  
  // Parsing start time and adding estimated hours
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time;
  
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  // Converting to 24-hour format
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  // Adding estimated hours
  const estHours = typeof estimatedHours === 'number' ? estimatedHours : parseInt(String(estimatedHours).replace(/\D/g, ''), 10) || 0;
  const endHour = hour + estHours;
  
  // Converting back to 12-hour format
  const endHour12 = endHour > 12 ? endHour - 12 : (endHour === 0 ? 12 : endHour === 12 ? 12 : endHour);
  const endPeriod = endHour >= 12 ? 'pm' : 'am';
  
  const startTimeLower = time.toLowerCase();
  return `${startTimeLower} - ${endHour12}:${minute.toString().padStart(2, '0')} ${endPeriod}`;
};

const formatPrice = (value?: string | number): string => {
  if (value === null || value === undefined || value === '') return '₱ 0.00';
  if (typeof value === 'number') return `₱ ${value.toFixed(2)}`;
  const str = String(value).trim();
  // Removing existing ₱ if present and extracting number
  const numStr = str.replace(/[₱,\s]/g, '');
  const num = parseFloat(numStr);
  if (isNaN(num)) return '₱ 0.00';
  return `₱ ${num.toFixed(2)}`;
};

export default function AppointmentDetails({
  branchName,
  branchAddress,
  branchImage,
  customerName,
  vehicleName,
  plateNumber,
  classification,
  date,
  time,
  orderSummary = [],
  amountDue,
  paymentMethod,
  estimatedCompletion,
  note,
  onBack,
}: AppointmentDetailsProps) {
  const insets = useSafeAreaInsets();
  // Extracting hours from estimatedCompletion (e.g., "3 Hours" -> 3)
  const extractHours = (est?: string | number): number => {
    if (!est) return 0;
    if (typeof est === 'number') return est;
    const match = String(est).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const estimatedHours = extractHours(estimatedCompletion);
  const formattedDate = formatDateForDisplay(date);
  const formattedTimeRange = formatTimeRange(time, estimatedHours);

  return (
    <View className="flex-1" style={{ backgroundColor: '#F5F5F5' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#F5F5F5' }} edges={["top"]}>
        {/* Header */}
        <View className="bg-white border-b border-gray-200" style={{ marginTop: -insets.top }}>
        <View className="flex-row items-center justify-between p-4" style={{ paddingTop: insets.top + 16 }}>
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-white border items-center justify-center"
            style={{ borderColor: 'rgba(179, 179, 179, 0.20)' }}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={24} color="#B3B3B3" />
          </TouchableOpacity>

          <Text className="text-2xl font-semibold text-[#1E1E1E]">Appointment Details</Text>

          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}>
        {/* Single White Card Container - matching ConfirmationStep design */}
        <View className="bg-white rounded-2xl mx-4 mb-4">
          {/* Branch Information Section */}
          <View className="p-4">
            <Text className="font-semibold text-[#1E1E1E] mb-2" style={{ fontSize: 20 }}>Branch</Text>
            <View className="flex-row justify-between items-start">
              <View className="flex-1 mr-3">
                <Text className="font-semibold text-[#1E1E1E] mb-1" style={{ fontSize: 20 }}>{branchName}</Text>
                <View className="flex-row items-center">
                  <Ionicons name="location" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
                  <Text className="text-gray-500 flex-1" style={{ fontSize: 16 }}>{branchAddress || 'No address provided'}</Text>
                </View>
              </View>
              {branchImage && (
                <Image source={branchImage} className="w-20 h-20 rounded-lg" resizeMode="cover" />
              )}
            </View>
          </View>

          {/* Separator Line */}
          <View className="px-4">
            <View className="h-[0.5px] bg-gray-200" />
          </View>

          {/* Customer Name Section */}
          {customerName && (
            <>
              <View className="p-4">
                <Text className="font-semibold text-[#1E1E1E] mb-3" style={{ fontSize: 20 }}>Name</Text>
                <Text className="text-gray-500" style={{ fontSize: 16 }}>{customerName}</Text>
              </View>

              {/* Separator Line */}
              <View className="px-4">
                <View className="h-[0.5px] bg-gray-200" />
              </View>
            </>
          )}

          {/* Vehicle Information Section */}
          {(vehicleName || plateNumber || classification) && (
            <>
              <View className="p-4">
                <Text className="font-semibold text-[#1E1E1E] mb-3" style={{ fontSize: 20 }}>Vehicle</Text>
                <View className="flex-row items-center">
                  <Image
                    source={getVehicleIcon(classification)}
                    className="w-10 h-10"
                    resizeMode="contain"
                    style={{ tintColor: '#F9EF08' }}
                  />
                  <View className="w-[0.5px] h-10 bg-gray-200 mx-3" />
                  <View className="flex-1 flex-row items-center justify-between">
                    <Text className="text-gray-500" style={{ fontSize: 16 }}>{vehicleName || '-'}</Text>
                    <Text className="text-gray-500" style={{ fontSize: 16 }}>{plateNumber || ''} {classification || ''}</Text>
                  </View>
                </View>
              </View>

              {/* Separator Line */}
              <View className="px-4">
                <View className="h-[0.5px] bg-gray-200" />
              </View>
            </>
          )}

          {/* Date & Time Section */}
          {(date || time) && (
            <>
              <View className="p-4">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="font-semibold text-[#1E1E1E]" style={{ fontSize: 20 }}>Date & Time</Text>
                  <Text className="text-gray-500" style={{ fontSize: 16 }}>{formattedDate}</Text>
                </View>
                {formattedTimeRange && (
                  <View className="items-end">
                    <Text className="text-gray-500" style={{ fontSize: 16 }}>{formattedTimeRange}</Text>
                  </View>
                )}
              </View>

              {/* Separator Line */}
              <View className="px-4">
                <View className="h-[0.5px] bg-gray-200" />
              </View>
            </>
          )}

          {/* Order Summary Section */}
          <View className="p-4">
            <Text className="font-semibold text-[#1E1E1E] mb-3" style={{ fontSize: 20 }}>Order Summary</Text>
            {orderSummary.length === 0 ? (
              <Text className="text-gray-500" style={{ fontSize: 16 }}>No items</Text>
            ) : (
              orderSummary.map((item, idx) => (
                <View key={idx} className="flex-row justify-between mb-2">
                  <Text className="text-gray-500" style={{ fontSize: 16 }}>{item.label}</Text>
                  <Text className="text-gray-500" style={{ fontSize: 16 }}>{formatPrice(item.price)}</Text>
                </View>
              ))
            )}
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
          {estimatedCompletion && (
            <>
              <View className="p-4">
                <View className="flex-row justify-between items-center">
                  <Text className="font-semibold text-[#1E1E1E]" style={{ fontSize: 20 }}>Estimated Time of Completion</Text>
                  <Text className="text-gray-500" style={{ fontSize: 16 }}>{estimatedHours} {estimatedHours === 1 ? 'Hour' : 'Hours'}</Text>
                </View>
              </View>

              {/* Separator Line */}
              <View className="px-4">
                <View className="h-[0.5px] bg-gray-200" />
              </View>
            </>
          )}

          {/* Note to Branch Section */}
          <View className="p-4">
            <Text className="font-semibold text-[#1E1E1E] mb-3" style={{ fontSize: 20 }}>Note to Branch</Text>
            <View className="rounded-lg border border-gray-200 p-3 min-h-[80px]">
              <Text className="text-[#1E1E1E]" style={{ fontSize: 14 }}>{note || 'No note provided.'}</Text>
            </View>
          </View>

          {/* Disclaimer Section */}
          <View className="pb-4">
            <Text className="font-regular text-[#1E1E1E] mb-1 text-center" style={{ fontSize: 18 }}>Disclaimer</Text>
            <Text className="text-gray-500 italic text-center px-10" style={{ fontSize: 15 }}>
              Final duration of the carwash will depend on the car size and state
            </Text>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/*
Usage example:
<AppointmentDetails
  branchName="P. Mabolo"
  branchAddress="Branch 1, Cebu City"
  branchImage={require('../../../../assets/images/samplebranch.png')}
  vehicleName="toyota raize"
  plateNumber="GAV8392"
  classification="SUV"
  date="11/30/2025"
  time="8:00"
  orderSummary={[{ label: 'Body Wash', price: '₱220.0' }, { label: 'Under Chassis', price: '₱100.0' }]}
  amountDue="₱340.00"
  paymentMethod="Card Payment"
  estimatedCompletion="3 Hours"
  note="Please be gentle with the rims"
  onBack={() => router.back()}
/>
*/

