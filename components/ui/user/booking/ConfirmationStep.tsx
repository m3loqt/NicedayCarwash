import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

export default function ConfirmationStep({ branch, vehicle, services, addons, dateTime, paymentMethod, onDone }: any) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    // Simulate submit (replace with real API/Firebase write)
    setTimeout(() => {
      setSubmitting(false);
      // Navigate to full-screen success page
      router.replace('/user/booking-success');
    }, 1200);
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-lg font-semibold mb-4">Confirmation</Text>

        <View className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-medium">Branch</Text>
          <Text className="text-sm text-gray-600">{branch?.name}</Text>
        </View>

        <View className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-medium">Vehicle</Text>
          <Text className="text-sm text-gray-600">{vehicle?.vname} - {vehicle?.vplateNumber}</Text>
        </View>

        <View className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-medium">Services</Text>
          {services.map((s: any) => <Text key={s.id}>{s.name}</Text>)}
          {addons.map((a: any) => <Text key={a.id}>{a.name}</Text>)}
        </View>

        <View className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-medium">Date & Time</Text>
          <Text className="text-sm text-gray-600">{dateTime}</Text>
        </View>

        <View className="bg-white rounded-xl p-4 mb-3">
          <Text className="font-medium">Payment</Text>
          <Text className="text-sm text-gray-600">{paymentMethod}</Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 right-6 px-6 py-3 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
        onPress={handleConfirm}
      >
        {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Confirm</Text>}
      </TouchableOpacity>
    </View>
  );
}
