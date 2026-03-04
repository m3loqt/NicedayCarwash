import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../../firebase/firebase';

type UserData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profileImage?: string;
};

const menuItems = [
  { label: 'Account details', icon: 'person-outline' as const, route: '/user/edit-profile' },
  { label: 'Payment method', icon: 'card-outline' as const, route: null },
  { label: 'Addresses', icon: 'location-outline' as const, route: null },
  { label: 'Reset password', icon: 'lock-closed-outline' as const, route: '/forgot-password' },
];

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { alert, AlertComponent } = useAlert();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

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
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleMenuPress = (route: string | null) => {
    if (route) router.push(route as any);
  };

  const handleSignOut = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await auth.signOut();
          await AsyncStorage.clear();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <Text className="text-3xl font-bold text-[#1A1A1A]">Account</Text>
        </View>

        {/* Profile section */}
        <View className="items-center pt-2 pb-6">
          {/* Avatar */}
          <View className="mb-3" style={{ width: 80, height: 80 }}>
            <View className="w-20 h-20 rounded-full bg-[#FAFAFA] overflow-hidden border border-[#EEEEEE]">
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
            >
              <Ionicons name="camera" size={11} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text className="text-xl font-bold text-[#1A1A1A]">
            {user ? `${user.firstName} ${user.lastName}` : '...'}
          </Text>
          {/* Phone or email */}
          <Text className="text-[13px] text-[#999] mt-0.5">
            {user?.phone || user?.email || ''}
          </Text>
        </View>

        {/* Menu items */}
        <View className="mx-5 mt-2">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`bg-[#FAFAFA] rounded-2xl px-5 py-5 flex-row items-center justify-between ${
                index < menuItems.length - 1 ? 'mb-1.5' : ''
              }`}
              onPress={() => handleMenuPress(item.route)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Ionicons name={item.icon} size={18} color="#999" />
                <Text className="text-[15px] text-[#1A1A1A] ml-3">{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
            </TouchableOpacity>
          ))}

          {/* Logout */}
          <TouchableOpacity
            className="bg-[#FAFAFA] rounded-2xl px-5 py-5 flex-row items-center justify-between mt-1.5"
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={18} color="#999" />
              <Text className="text-[15px] text-[#1A1A1A] ml-3">Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}
