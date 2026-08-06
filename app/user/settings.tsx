import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StatusBar, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [notificationsGranted, setNotificationsGranted] = useState<boolean | null>(null);

  const refreshPermissionStatus = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsGranted(status === 'granted');
  }, []);

  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const handleToggleNotifications = async () => {
    if (notificationsGranted) {
      // Runtime permission cannot be revoked from within the app - send the user to system
      // settings, where they can turn it off for this app specifically.
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }
      return;
    }
    await registerForPushNotificationsAsync();
    await refreshPermissionStatus();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-9 h-9 rounded-full border border-[#EEEEEE] bg-white items-center justify-center mr-3"
        >
          <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-[17px] font-inter-semibold tracking-tight text-[#1A1A1A]">Settings</Text>
      </View>

      <View className="mx-5 mt-2">
        <View className="bg-white rounded-2xl px-5 py-5 flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center flex-1 mr-3">
            <Ionicons name="notifications-outline" size={18} color="#999" />
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-inter-medium tracking-tight text-[#1A1A1A]">
                Push Notifications
              </Text>
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#999] mt-0.5">
                Get notified about your booking status
              </Text>
            </View>
          </View>
          <Switch
            value={!!notificationsGranted}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#E5E5E5', true: '#F9EF08' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity
          className="bg-white rounded-2xl px-5 py-5 flex-row items-center justify-between"
          onPress={() => router.push('/forgot-password')}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <Ionicons name="lock-closed-outline" size={18} color="#999" />
            <Text className="text-[15px] font-inter-medium tracking-tight text-[#1A1A1A] ml-3">
              Reset Password
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
