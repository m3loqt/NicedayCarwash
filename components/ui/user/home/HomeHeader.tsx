import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../../../firebase/firebase';
import PromotionalBanner, { BANNER_HEIGHT } from './PromotionalBanner';

// Gap of visible yellow between the search bar and the banner's top edge, before the
// overlap (banner still covers half its own height in yellow, just not flush against the search bar).
const SEARCH_BAR_GAP = 22;
const BANNER_OVERLAP = BANNER_HEIGHT / 2;

export default function HomeHeader() {
  const insets = useSafeAreaInsets();
  const [showFilter, setShowFilter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const notifRef = ref(db, `Notifications/ByUser/${uid}`);
    const unsub = onValue(notifRef, (snap) => {
      if (!snap.exists()) { setUnreadCount(0); return; }
      const data = snap.val();
      const count = Object.values(data).filter((n: any) => !n.read).length;
      setUnreadCount(count);
    });
    return () => unsub();
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
      <View
        className="bg-[#F9EF08] px-5 pt-4 rounded-b-2xl"
        style={{ paddingBottom: SEARCH_BAR_GAP + BANNER_OVERLAP }}
      >
        {/* Top row: logo + notification */}
        <View className="flex-row justify-between items-center mb-5">
          <Image
            source={require('../../../../assets/images/ndcwlogo.png')}
            className="w-28 h-14"
            resizeMode="contain"
          />
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-[#1A1A00]/10 items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => router.push('/user/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#1A1A00" />
            {unreadCount > 0 && (
              <View className="absolute top-1.5 right-1.5 min-w-[10px] h-[10px] rounded-full bg-red-500 border-2 border-[#F9EF08] items-center justify-center px-[1px]">
                {unreadCount > 9 ? (
                  <Text style={{ fontSize: 6, color: '#fff', fontWeight: '700', lineHeight: 8 }}>9+</Text>
                ) : null}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          className="bg-[#FAFAFA] rounded-2xl px-4 py-2 flex-row items-center border border-[#EEEEEE]"
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

      {/* Promotional banner — overlaps the header bottom by half its own height */}
      <View className="px-5 z-30" style={{ marginTop: -BANNER_OVERLAP }}>
        <PromotionalBanner />
      </View>
    </View>
  );
}
