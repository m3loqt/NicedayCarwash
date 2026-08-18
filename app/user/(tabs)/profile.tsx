import SignOutModal from '@/components/ui/SignOutModal';
import { useAlert } from '@/hooks/use-alert';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../../firebase/firebase';

const menuItems = [
  { label: 'Your Profile', icon: 'person-outline' as const, route: '/user/edit-profile' as const },
  { label: 'My Bookings', icon: 'calendar-outline' as const, route: '/user/(tabs)/history' as const },
  { label: 'Settings', icon: 'settings-outline' as const, route: '/user/settings' as const },
  { label: 'Help Center', icon: 'help-circle-outline' as const, route: '/user/help-center' as const },
  { label: 'Privacy Policy', icon: 'shield-checkmark-outline' as const, route: '/user/privacy-policy' as const },
];

export default function UserProfileScreen() {
  const { alert, AlertComponent } = useAlert();
  const tabBarClearance = useTabBarClearance();
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <Text className="text-3xl font-inter-semibold tracking-tight text-[#1A1A1A]">Profile</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
          {/* Menu items */}
          <View className="mx-5 mt-4">
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                className={`bg-white rounded-2xl px-5 py-5 flex-row items-center justify-between ${
                  index < menuItems.length - 1 ? 'mb-1.5' : ''
                }`}
                onPress={() => handleMenuPress(item.route)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <Ionicons name={item.icon} size={18} color="#999" />
                  <Text className="text-[15px] font-inter-medium tracking-tight text-[#1A1A1A] ml-3">{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
              </TouchableOpacity>
            ))}

            {/* Logout */}
            <TouchableOpacity
              className="bg-white rounded-2xl px-5 py-5 flex-row items-center justify-between mt-1.5"
              onPress={handleSignOutPress}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons name="log-out-outline" size={18} color="#999" />
                <Text className="text-[15px] font-inter-medium tracking-tight text-[#1A1A1A] ml-3">Logout</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <SignOutModal
          visible={signOutModalVisible}
          onClose={() => setSignOutModalVisible(false)}
          onConfirm={handleSignOutConfirm}
          loading={signingOut}
        />
        {AlertComponent}
      </SafeAreaView>
    </View>
  );
}
