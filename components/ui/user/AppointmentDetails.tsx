import { Ionicons } from '@expo/vector-icons';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface OrderItem {
  label: string;
  price: string;
}

export interface AppointmentDetailsProps {
  branchName: string;
  branchAddress?: string;
  branchImage?: any; // require(...) or { uri: string }
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

const getVehicleIcon = (vehicleType: string) => {
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

export default function AppointmentDetails({
  branchName,
  branchAddress,
  branchImage,
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
  const formatPrice = (value?: string | number) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') return `₱${value}`;
    const str = String(value).trim();
    if (str.startsWith('₱')) return str;
    return `₱${str}`;
  };
  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={["top"]}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-[#1E1E1E]">Appointment Details</Text>

          <View className="w-10" />
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-xl p-4 shadow-md">
          {/* Branch */}
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-base font-semibold text-[#1E1E1E]">Branch</Text>
              <Text className="text-xl font-bold text-[#1E1E1E] mt-2">{branchName}</Text>
              {branchAddress ? (
                <Text className="text-sm text-gray-500 mt-1">{branchAddress} </Text>
              ) : null}
            </View>

            {branchImage ? (
              <Image
                source={branchImage}
                className="w-16 h-16 rounded-lg"
                resizeMode="cover"
              />
            ) : null}
          </View>

          {/* Vehicle */}
          {(vehicleName || plateNumber || classification) && (
            <View className="border-t border-gray-200 pt-4">
              <Text className="text-base font-semibold text-[#1E1E1E] mb-2">Vehicle</Text>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Image
                    source={getVehicleIcon(classification || '')}
                    className="w-10 h-10 rounded-full mr-3"
                    resizeMode="contain"
                  />
                  <Text className="text-gray-800 text-base">{vehicleName || '-'}</Text>
                </View>
                <Text className="text-gray-600">{plateNumber ? `${plateNumber} - ${classification || ''}` : ''}</Text>
              </View>
            </View>
          )}

          {/* Date Time */}
          {(date || time) && (
            <View className="border-t border-gray-200 pt-4">
              <View className="flex-row justify-between items-start">
                <Text className="text-base font-semibold text-[#1E1E1E]">Date Time</Text>
                <View className="items-end mb-4">
                  <Text className="text-gray-800">{date || ''}</Text>
                  {time ? <Text className="text-gray-600 mt-1">{time}</Text> : null}
                </View>
              </View>
            </View>
          )}

          {/* Order Summary */}
          <View className="border-t border-gray-200 pt-4">
            <Text className="text-base font-semibold text-[#1E1E1E] mb-3">Order Summary</Text>
            {orderSummary.length === 0 ? (
              <Text className="text-gray-600">No items</Text>
            ) : (
              orderSummary.map((item, idx) => (
                <View key={idx} className="flex-row justify-between py-1">
                  <Text className="text-gray-700">{item.label}</Text>
                  <Text className="text-gray-700">{formatPrice(item.price)}</Text>
                </View>
              ))
            )}

            <View className="h-px bg-gray-200 my-3" />
            <View className="flex-row justify-end mb-4 items-center">
              <Text className="text-base font-semibold text-[#1E1E1E] mr-2">Amount Due</Text>
              <Text className="text-base font-bold text-[#1E1E1E]">{formatPrice(amountDue)}</Text>
            </View>
          </View>

          {/* Payment + Estimated */}
          <View className="border-t border-gray-200 pt-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-semibold text-[#1E1E1E]">Payment Method</Text>
              <Text className="text-gray-800">{paymentMethod || '-'}</Text>
            </View>

            <View className="h-px bg-gray-200 my-3" />

            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-semibold text-[#1E1E1E]">Estimated Completion</Text>
              <Text className="text-gray-800">{estimatedCompletion || '-'} Hours</Text>
            </View>
          </View>

          {/* Note */}
          <View className="border-t border-gray-200 pt-4">
            <Text className="text-base font-semibold text-[#1E1E1E] mb-3">Note to Branch</Text>
            <View className="bg-gray-50 rounded-lg border border-gray-200 p-3">
              <Text className="text-gray-600">{note || ''}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
