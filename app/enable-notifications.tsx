import { ANDROID_KEEP_OPEN_HINT, registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, update } from 'firebase/database';
import { useState } from 'react';
import { AppButton } from '@/components/ui/common/AppButton';
import { ActivityIndicator, Image, Linking, Platform, StatusBar, Text, View } from 'react-native';
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
        <Image
          source={require('../assets/images/enablenotif.png')}
          style={{ width: 160, height: 160, marginBottom: 8 }}
          resizeMode="contain"
        />

        <Text className="text-[22px] font-inter-semibold tracking-tight text-[#1A1A1A] mb-1.5 text-center">
          Enable Notification Access
        </Text>
        <Text
          className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center mb-10"
          style={{ maxWidth: 260 }}
        >
          Get notified the moment your booking status changes
        </Text>

        <AppButton
          className={`w-full bg-[#F9EF08] rounded-full py-4 items-center mb-5 min-h-[52px] justify-center ${requesting ? 'opacity-60' : ''}`}
          onPress={handleAllowNotifications}
          disabled={requesting}
        >
          {requesting ? (
            <ActivityIndicator size="small" color="#1A1A00" />
          ) : (
            <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">
              Allow Notification
            </Text>
          )}
        </AppButton>

        <AppButton onPress={finishOnboarding} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-[13px] font-inter-medium tracking-tight text-[#666]">
            Maybe Later
          </Text>
        </AppButton>

        {Platform.OS === 'android' && (
          <View className="mt-8 items-center" style={{ maxWidth: 280 }}>
            <Text className="text-[12px] font-inter-regular tracking-tight text-[#999] text-center">
              {ANDROID_KEEP_OPEN_HINT}
            </Text>
            <AppButton
              onPress={() => Linking.openSettings()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="mt-1.5"
            >
              <Text className="text-[12px] font-inter-medium tracking-tight text-[#666]">
                Open app settings
              </Text>
            </AppButton>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
