import { getCurrentLocation } from '@/lib/location';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EnableLocationScreen() {
  const [requesting, setRequesting] = useState(false);

  // This screen never blocks progress - granted, denied, or skipped all lead to the next
  // step. "Enter Location Manually" has no manual address/geocoding feature to hook into
  // anywhere in this app yet, so for now it's equivalent to skipping.
  const proceed = () => router.replace('/enable-notifications');

  const handleAllowLocation = async () => {
    setRequesting(true);
    await getCurrentLocation();
    setRequesting(false);
    proceed();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="flex-1 px-6 justify-center items-center">
        <View className="w-20 h-20 rounded-full bg-[#FAFAFA] items-center justify-center mb-6">
          <Ionicons name="location" size={32} color="#1A1A1A" />
        </View>

        <Text className="text-[22px] font-inter-semibold tracking-tight text-[#1A1A1A] mb-1.5 text-center">
          What is Your Location?
        </Text>
        <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center mb-10">
          To find nearby service providers
        </Text>

        <TouchableOpacity
          className={`w-full bg-[#F9EF08] rounded-full py-4 items-center mb-5 min-h-[52px] justify-center ${requesting ? 'opacity-60' : ''}`}
          onPress={handleAllowLocation}
          disabled={requesting}
          activeOpacity={0.85}
        >
          {requesting ? (
            <ActivityIndicator size="small" color="#1A1A00" />
          ) : (
            <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">
              Allow Location Access
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={proceed} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-[13px] font-inter-medium tracking-tight text-[#666]">
            Enter Location Manually
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
