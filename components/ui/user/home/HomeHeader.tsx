import { Ionicons } from '@expo/vector-icons';
import { get, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../../../firebase/firebase';
import PromotionalBanner from './PromotionalBanner';

type UserData = {
  firstName: string;
  lastName: string;
};

export default function HomeHeader() {
  const insets = useSafeAreaInsets();
  const [showFilter, setShowFilter] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserName = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      try {
        const snapshot = await get(ref(db, `users/${uid}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setUser({
            firstName: data.firstName,
            lastName: data.lastName,
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserName();
  }, []);

  const handleFilterToggle = () => {
    setShowFilter(!showFilter);
  };

  const handleRegionSelect = (region: string) => {
    setShowFilter(false);
  };

  return (
    <View className="mb-8">
      {/* Yellow Header Background */}
      <View className="bg-[#F9EF08] px-4 pt-8 pb-36 relative z-20" style={{ marginTop: -insets.top, paddingTop: insets.top + 32 }}>
        {/* Greeting + Logo */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-800 text-2xl font-bold">Hello, Welcome Back!</Text>
            <Text className="text-gray-800 text-xl font-semibold opacity-90">
              {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
            </Text>
          </View>
          <Image 
            source={require('../../../../assets/images/ndcwlogo.png')}
            className="w-24 h-12"
            resizeMode="contain"
          />
        </View>

        {/* Search Bar */}
        <View className="bg-white rounded-xl px-4 py-3 flex-row items-center shadow">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput 
            placeholder="Search branch"
            placeholderTextColor="#9CA3AF"
            className="flex-1 ml-3 text-gray-800"
          />
          <TouchableOpacity onPress={handleFilterToggle} className="ml-2">
            <Image 
              source={require('../../../../assets/images/search2_burger.png')}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Dropdown */}
      {showFilter && (
        <View className="absolute z-50 left-4 right-4 bg-white rounded-xl shadow-lg"
              style={{ top: 150, elevation: 10 }}>
          <TouchableOpacity 
            className="px-4 py-3 border-b border-gray-200"
            onPress={() => handleRegionSelect('Luzon')}
          >
            <Text className="text-gray-700 text-base">Luzon</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="px-4 py-3 border-b border-gray-200"
            onPress={() => handleRegionSelect('Visayas')}
          >
            <Text className="text-gray-700 text-base">Visayas</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="px-4 py-3"
            onPress={() => handleRegionSelect('Mindanao')}
          >
            <Text className="text-gray-700 text-base">Mindanao</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Promotional Banner */}
      <View className="-mt-28 z-30 px-4">
        <PromotionalBanner />
      </View>
    </View>
  );
}
