import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


interface ServiceOrAddon {
  id: string;
  name: string;
  price?: string;
}

interface ConfirmationStepProps {
  branch: { name: string; address?: string; image?: any };
  vehicle: { vname: string; vplateNumber: string; classification?: string };
  services: ServiceOrAddon[];
  addons: ServiceOrAddon[];
  dateTime: string | null;
  paymentMethod: string | null;
  note?: string;
  onBack?: () => void;
  onDone?: () => void;
}

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

export default function ConfirmationStep({
  branch,
  vehicle,
  services,
  addons,
  dateTime,
  paymentMethod,
  note,
  onBack,
  onDone,
}: ConfirmationStepProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onDone?.();
      router.replace('/user/booking-success');
    }, 1200);
  };

  const formatPrice = (value?: string | number) => {
    if (!value) return '-';
    if (typeof value === 'number') return `₱${value.toFixed(2)}`;
    return value.startsWith('₱') ? value : `₱${value}`;
  };

  const orderSummary = [...services, ...addons].map((item) => ({
    label: item.name,
    price: item.price || '-',
  }));

  const amountDue =
    orderSummary.length > 0
      ? orderSummary
          .map((item) => parseFloat(String(item.price).replace('₱', '')) || 0)
          .reduce((a, b) => a + b, 0)
      : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>


      <ScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="bg-white rounded-xl p-4 shadow-md space-y-4">
          {/* Branch */}
          <View className="flex-row justify-between items-start">
            <View className="flex-1 mr-4">
              <Text className="text-base font-semibold text-gray-900">Branch</Text>
              <Text className="text-xl font-bold text-gray-900 mt-1">{branch?.name}</Text>
              {branch?.address && (
                <Text className="text-sm text-gray-500 mt-1">{branch.address}</Text>
              )}
            </View>
            {branch?.image && (
              <Image source={branch.image} className="w-16 h-16 rounded-lg" resizeMode="cover" />
            )}
          </View>

          {/* Vehicle */}
          <View className="border-t border-gray-200 pt-4">
            <Text className="text-base font-semibold text-gray-900 mb-2">Vehicle</Text>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Image
                  source={getVehicleIcon(vehicle?.classification)}
                  className="w-10 h-10 rounded-full mr-3"
                  resizeMode="contain"
                />
                <Text className="text-gray-800 text-base">{vehicle?.vname}</Text>
              </View>
              <Text className="text-gray-600">
                {vehicle?.vplateNumber} {vehicle?.classification ? `- ${vehicle.classification}` : ''}
              </Text>
            </View>
          </View>

          {/* Date & Time */}
          {dateTime && (
            <View className="border-t border-gray-200 pt-4">
              <Text className="text-base font-semibold text-gray-900 mb-2">Date & Time</Text>
              <Text className="text-gray-800">{dateTime}</Text>
            </View>
          )}

          {/* Order Summary */}
          <View className="border-t border-gray-200 pt-4">
            <Text className="text-base font-semibold text-gray-900 mb-2">Order Summary</Text>
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
            <View className="flex-row justify-end mb-2">
              <Text className="text-base font-semibold text-gray-900 mr-2">Amount Due</Text>
              <Text className="text-base font-bold text-gray-900">{formatPrice(amountDue)}</Text>
            </View>
          </View>

          {/* Payment */}
          <View className="border-t border-gray-200 pt-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-semibold text-gray-900">Payment Method</Text>
              <Text className="text-gray-800">{paymentMethod || '-'}</Text>
            </View>
          </View>

          {/* Note */}
          {note && (
            <View className="border-t border-gray-200 pt-4">
              <Text className="text-base font-semibold text-gray-900 mb-2">Note to Branch</Text>
              <View className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                <Text className="text-gray-600">{note}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <TouchableOpacity
        className="absolute bottom-6 left-6 right-6 bg-[#F9EF08] py-4 rounded-xl items-center justify-center shadow-lg"
        onPress={handleConfirm}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#333" />
        ) : (
          <Text className="text-white font-semibold text-lg">Finish</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
