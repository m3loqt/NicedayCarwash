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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

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
    <View className="mb-2">
      {/* Header */}
      <View className="bg-[#F9EF08] px-5 pt-4 pb-14 rounded-b-3xl">
        {/* Top row: greeting + logo + notification */}
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1 mr-3">
            <Text className="text-[#5C5C00] text-sm font-medium tracking-wide">
              {getGreeting()},
            </Text>
            <Text
              className="text-[#1A1A00] text-2xl font-bold mt-0.5"
              numberOfLines={1}
            >
              {user ? user.firstName : '...'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Image
              source={require('../../../../assets/images/ndcwlogo.png')}
              className="w-20 h-10"
              resizeMode="contain"
            />
            <TouchableOpacity
              className="ml-3 w-10 h-10 rounded-full bg-[#1A1A00]/10 items-center justify-center"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={20} color="#1A1A00" />
              <View
                className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-[#F9EF08]"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View
          className="bg-[#FAFAFA] rounded-2xl px-4 py-3 flex-row items-center border border-[#EEEEEE]"
        >
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search for a branch..."
            placeholderTextColor="#ACACAC"
            className="flex-1 ml-3 text-[15px] text-gray-800"
          />
          <TouchableOpacity
            onPress={handleFilterToggle}
            className="ml-2 p-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="options-outline" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter dropdown */}
      {showFilter && (
        <View
          className="absolute z-50 left-5 right-5 bg-white rounded-2xl overflow-hidden"
          style={{
            top: 130,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {['Luzon', 'Visayas', 'Mindanao'].map((region, i, arr) => (
            <TouchableOpacity
              key={region}
              className={`px-5 py-4 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
              onPress={() => handleRegionSelect(region)}
            >
              <Text className="text-gray-700 text-[15px] font-medium">{region}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Promotional banner — overlaps the header bottom */}
      <View className="-mt-6 px-5 z-30">
        <PromotionalBanner />
      </View>
    </View>
  );
}
