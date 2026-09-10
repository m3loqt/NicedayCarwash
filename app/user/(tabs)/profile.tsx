import SignOutModal from '@/components/ui/SignOutModal';
import { useAlert } from '@/hooks/use-alert';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, StatusBar, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../../firebase/firebase';

const topItems = [
  { label: 'Your Profile', icon: 'person-outline' as const, route: '/user/edit-profile' as const },
  { label: 'My Bookings', icon: 'calendar-outline' as const, route: '/user/(tabs)/history' as const },
];

const helpItems = [
  { label: 'Help Center', icon: 'help-circle-outline' as const, route: '/user/help-center' as const },
  { label: 'Privacy Policy', icon: 'shield-checkmark-outline' as const, route: '/user/privacy-policy' as const },
  { label: 'Terms and Condition', icon: 'document-text-outline' as const, route: '/terms' as const },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="px-1 pb-2 text-[12px] font-bold text-[#999] uppercase tracking-wide">
      {children}
    </Text>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`bg-white rounded-2xl px-5 py-5 flex-row items-center justify-between ${isLast ? '' : 'mb-1.5'}`}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={18} color="#999" />
        <Text className="text-[15px] font-inter-medium tracking-tight text-[#1A1A1A] ml-3">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
    </TouchableOpacity>
  );
}

export default function UserProfileScreen() {
  const { alert, AlertComponent } = useAlert();
  const tabBarClearance = useTabBarClearance();
  // react-native-safe-area-context's insets.top can briefly read 0 on this screen's first
  // paint (the header flashing flush against the status bar before settling). See
  // notifications.tsx for the same fix - StatusBar.currentHeight is synchronous on Android.
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  const handleMenuPress = (route: string | null) => {
    if (route) router.push(route as any);
  };

  const handleSignOutConfirmWithOnboarding = async () => {
    setSigningOut(true);
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      await auth.signOut();
      await AsyncStorage.clear();
      if (hasSeenOnboarding === 'true') {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      }
      router.replace('/');
    } catch {
      // sign out failed
    } finally {
      setSigningOut(false);
      setSignOutModalVisible(false);
    }
  };

  const handleSignOutPress = () => {
    setSignOutModalVisible(true);
  };

  const handleSignOutConfirm = handleSignOutConfirmWithOnboarding;

  return (
    <View className="flex-1 bg-[#FAFAFA]" style={{ paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <View className="flex-1">
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <Text className="text-3xl font-inter-semibold tracking-tight text-[#1A1A1A]">Profile</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
          <View className="mx-5 mt-4">
            {/* Uncategorized */}
            {topItems.map((item, index) => (
              <MenuRow
                key={item.label}
                icon={item.icon}
                label={item.label}
                onPress={() => handleMenuPress(item.route)}
                isLast={index === topItems.length - 1}
              />
            ))}

            {/* Settings */}
            <View className="mt-6 mb-2">
              <SectionLabel>Settings</SectionLabel>
            </View>
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
            <MenuRow
              icon="lock-closed-outline"
              label="Reset Password"
              onPress={() => router.push('/forgot-password')}
              isLast
            />

            {/* Help */}
            <View className="mt-6 mb-2">
              <SectionLabel>Help</SectionLabel>
            </View>
            {helpItems.map((item, index) => (
              <MenuRow
                key={item.label}
                icon={item.icon}
                label={item.label}
                onPress={() => handleMenuPress(item.route)}
                isLast={index === helpItems.length - 1}
              />
            ))}

            {/* Logout */}
            <TouchableOpacity
              className="bg-white rounded-2xl px-5 py-5 flex-row items-center justify-between mt-6"
              onPress={handleSignOutPress}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons name="log-out-outline" size={18} color="#999" />
                <Text className="text-[15px] font-inter-medium tracking-tight text-[#1A1A1A] ml-3">Logout</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
            </TouchableOpacity>

            <Text className="text-center text-[11px] text-[#BDBDBD] mt-4">
              App version {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </ScrollView>

        <SignOutModal
          visible={signOutModalVisible}
          onClose={() => setSignOutModalVisible(false)}
          onConfirm={handleSignOutConfirm}
          loading={signingOut}
        />
        {AlertComponent}
      </View>
    </View>
  );
}
