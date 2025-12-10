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
  profileImage?: string;
};

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
            profileImage: data.profileImage,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleEditAccount = () => {
    router.push('/user/edit-profile');
  };

  const handleSignOut = async () => {
    try {
      // Confirming before signing out
      alert('Logout', 'Are you sure you want to sign out?', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // Preserving onboarding status before clearing storage
            const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
            await auth.signOut();
            await AsyncStorage.clear();
            // Restoring onboarding status after clearing
            if (hasSeenOnboarding === 'true') {
              await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            }
            router.replace('/');
          },
        },
      ]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#F5F5F5' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: '#F5F5F5' }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      
      {/* Header */}
      <View className="flex flex-row items-center p-4 bg-white border-b border-gray-200" style={{ marginTop: -insets.top, paddingTop: insets.top + 16 }}>
        <View className="w-8" />
        <Text className="flex-1 text-center text-2xl font-semibold text-[#1E1E1E]">Account</Text>
        <View className="w-8" />
      </View>

      {/* Profile Card */}
      <View className="bg-white rounded-lg shadow-md mx-4 mt-4 p-4">
        <View className="flex flex-row items-center">
          {/* Profile Image or Placeholder */}
          <View className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mr-4">
            {user && user.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full flex items-center justify-center bg-gray-200">
                <Ionicons name="person" size={50} color="#9CA3AF" />
              </View>
            )}
          </View>
          <View className="flex flex-col">
            <Text className="text-2xl font-semibold text-[#1E1E1E]">
              {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
            </Text>
            <Text className="text-sm text-gray-500">
              {user ? user.email : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          className="mt-4 px-6 py-4 mx-2 text-center border border-[#F9EF08] rounded-md w-full bg-white self-start"
          onPress={handleEditAccount}
        >
          <Text className="text-[#F9EF08] text-center font-semibold">Edit Account</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out Section */}
      <TouchableOpacity 
        className="bg-white rounded-lg mx-4 mt-4 p-4 flex flex-row items-center"
        onPress={handleSignOut}
      >
        <Ionicons name="log-out" size={24} color="#1E1E1E" className="mr-3" />
        <Text className="text-lg text-[#1E1E1E]">Sign Out</Text>
      </TouchableOpacity>
      {AlertComponent}
      </SafeAreaView>
    </View>
  );
}
