import { AccountSkeleton } from '@/components/ui/user/UserScreenSkeleton';
import SignOutModal from '@/components/ui/SignOutModal';
import { useAlert } from '@/hooks/use-alert';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { logError } from '@/lib/logger';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../../firebase/firebase';

type UserData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
};

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
  const [user, setUser] = useState<UserData | null>(null);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUser({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            profileImage: data.profileImage,
          });
        }
      } catch (error) {
        logError('UserProfile.fetchUserData', error, { context: 'Error fetching user data' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

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

  if (loading) {
    return (
      <View className="flex-1 bg-[#FAFAFA]">
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <SafeAreaView className="flex-1" edges={['top']}>
          <View className="px-5 pt-4 pb-4">
            <Text className="text-3xl font-bold text-[#1A1A1A]">Account</Text>
          </View>
          <AccountSkeleton />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <Text className="text-3xl font-inter-semibold tracking-tight text-[#1A1A1A]">Profile</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarClearance }}>
          {/* Profile section */}
          <View className="items-center pt-2 pb-6">
            {/* Avatar */}
            <View className="mb-3" style={{ width: 80, height: 80 }}>
              <View className="w-20 h-20 rounded-full bg-white overflow-hidden border border-[#EEEEEE]">
                {user?.profileImage ? (
                  <Image
                    source={{ uri: user.profileImage }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Ionicons name="person" size={36} color="#BDBDBD" />
                  </View>
                )}
              </View>
              <TouchableOpacity
                className="absolute w-6 h-6 rounded-full bg-[#1A1A1A] items-center justify-center border-2 border-white"
                style={{ bottom: '15%', right: '10%' }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                onPress={() => router.push('/user/edit-profile')}
              >
                <Ionicons name="camera" size={11} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text className="text-xl font-inter-semibold tracking-tight text-[#1A1A1A]">
              {user ? `${user.firstName} ${user.lastName}` : '...'}
            </Text>
            {/* Phone or email */}
            <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] mt-0.5">
              {user?.phone || user?.email || ''}
            </Text>
          </View>

          {/* Menu items */}
          <View className="mx-5 mt-2">
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
