import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, update } from 'firebase/database';
import { useState } from 'react';
import { ActivityIndicator, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EnableNotificationsScreen() {
  const [requesting, setRequesting] = useState(false);

  // Final step of the post-signup flow - always completes onboarding regardless of the
  // notification permission outcome, since this screen must never block the user.
  const finishOnboarding = async () => {
    const uid = getAuth().currentUser?.uid;
    if (uid) {
      await update(ref(getDatabase(), `users/${uid}`), { onboardingCompleted: true });
    }
    router.replace('/user/(tabs)/home');
  };

  const handleAllowNotifications = async () => {
    setRequesting(true);
    await registerForPushNotificationsAsync();
    setRequesting(false);
    finishOnboarding();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="flex-1 px-6 justify-center items-center">
        <View className="w-20 h-20 rounded-full bg-[#FAFAFA] items-center justify-center mb-6">
          <Ionicons name="notifications" size={32} color="#1A1A1A" />
        </View>

        <Text className="text-[22px] font-inter-semibold tracking-tight text-[#1A1A1A] mb-1.5 text-center">
          Enable Notification Access
        </Text>
        <Text
          className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center mb-10"
          style={{ maxWidth: 260 }}
        >
          Enable notifications to receive real-time updates
        </Text>

        <TouchableOpacity
          className={`w-full bg-[#F9EF08] rounded-full py-4 items-center mb-5 min-h-[52px] justify-center ${requesting ? 'opacity-60' : ''}`}
          onPress={handleAllowNotifications}
          disabled={requesting}
          activeOpacity={0.85}
        >
          {requesting ? (
            <ActivityIndicator size="small" color="#1A1A00" />
          ) : (
            <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">
              Allow Notification
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={finishOnboarding} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-[13px] font-inter-medium tracking-tight text-[#666]">
            Maybe Later
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
