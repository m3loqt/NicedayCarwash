import { AccountSkeleton } from '@/components/ui/admin/AdminScreenSkeleton';
import SignOutModal from '@/components/ui/SignOutModal';
import { auth, db } from '@/firebase/firebase';
import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AdminData = {
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
};

export default function AdminSettingsScreen() {
  const { alert, AlertComponent } = useAlert();
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setAdmin({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
            profileImage: data.profileImage,
          });
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const handleNotifications = () => {
    alert('Notifications', 'Notification settings will be available in a future update.');
  };

  const handleSignOutPress = () => {
    setSignOutModalVisible(true);
  };

  const handleSignOutConfirm = async () => {
    setSigningOut(true);
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      await auth.signOut();
      await AsyncStorage.clear();
      if (hasSeenOnboarding === 'true') {
        await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      }
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSigningOut(false);
      setSignOutModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="white" />
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
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-5 pt-4 pb-4">
          <Text className="text-3xl font-bold text-[#1A1A1A]">Account</Text>
        </View>

        {/* Profile section */}
        <View className="items-center pt-2 pb-6">
          <View className="mb-3" style={{ width: 80, height: 80 }}>
            <View className="w-20 h-20 rounded-full bg-[#FAFAFA] overflow-hidden border border-[#EEEEEE]">
              {admin?.profileImage ? (
                <Image
                  source={{ uri: admin.profileImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Ionicons name="person" size={36} color="#BDBDBD" />
                </View>
              )}
            </View>
          </View>
          <Text className="text-xl font-bold text-[#1A1A1A]">
            {admin ? `${admin.firstName} ${admin.lastName}` : '...'}
          </Text>
          <Text className="text-[13px] text-[#999] mt-0.5">
            {admin?.email || ''}
          </Text>
        </View>

        {/* Menu items */}
        <View className="mx-5 mt-2">
          <TouchableOpacity
            className="bg-[#FAFAFA] rounded-2xl px-5 py-5 flex-row items-center justify-between mb-1.5"
            onPress={() => router.push('/admin/edit-profile')}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="person-outline" size={18} color="#999" />
              <Text className="text-[15px] text-[#1A1A1A] ml-3">Edit profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#FAFAFA] rounded-2xl px-5 py-5 flex-row items-center justify-between mb-1.5"
            onPress={handleNotifications}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={18} color="#999" />
              <Text className="text-[15px] text-[#1A1A1A] ml-3">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity
            className="bg-[#FAFAFA] rounded-2xl px-5 py-5 flex-row items-center justify-between mt-1.5"
            onPress={handleSignOutPress}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={18} color="#999" />
              <Text className="text-[15px] text-[#1A1A1A] ml-3">Sign out</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        {AlertComponent}

        <SignOutModal
          visible={signOutModalVisible}
          onClose={() => setSignOutModalVisible(false)}
          onConfirm={handleSignOutConfirm}
          loading={signingOut}
        />
      </SafeAreaView>
    </View>
  );
}
