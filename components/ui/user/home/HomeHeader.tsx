import { formatDistance, getCurrentLocation, haversineMeters } from '@/lib/location';
import { matchesSearch } from '@/lib/textMatch';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { get, onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../../../firebase/firebase';
import PromotionalBanner, { BANNER_HEIGHT } from './PromotionalBanner';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

interface BranchSuggestion {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

const MAX_SUGGESTIONS = 6;

// Gap of visible yellow between the search bar and the banner's top edge, before the
// overlap (banner still covers half its own height in yellow, just not flush against the search bar).
const SEARCH_BAR_GAP = 22;
const BANNER_OVERLAP = BANNER_HEIGHT / 2;

export default function HomeHeader() {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState<BranchSuggestion[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    let cancelled = false;
    getCurrentLocation().then((loc) => {
      if (!cancelled) setUserLocation(loc);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    let cancelled = false;
    get(ref(db, `users/${uid}/firstName`)).then((snap) => {
      if (!cancelled && snap.exists()) setFirstName(snap.val());
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Lightweight - just enough to power the search-as-you-type dropdown below. Full branch
  // detail (hours, phone, distance) still only loads in the actual branch-selection screen.
  useEffect(() => {
    const branchesRef = ref(db, 'Branches');
    const unsub = onValue(branchesRef, (snap) => {
      const list: BranchSuggestion[] = [];
      snap.forEach((child) => {
        const profile = child.child('profile').val();
        if (profile?.name) {
          const lat = Number(profile.latitude);
          const lng = Number(profile.longitude);
          list.push({
            id: child.key!,
            name: profile.name,
            address: profile.address || '',
            latitude: isFinite(lat) ? lat : undefined,
            longitude: isFinite(lng) ? lng : undefined,
          });
        }
        return false;
      });
      setBranches(list);
    });
    return () => unsub();
  }, []);

  const matchedBranches = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    const matches = branches.filter((b) => matchesSearch(`${b.name} ${b.address}`, q));
    if (userLocation) {
      matches.sort((a, b) => {
        const distA = a.latitude !== undefined && a.longitude !== undefined
          ? haversineMeters(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude)
          : Infinity;
        const distB = b.latitude !== undefined && b.longitude !== undefined
          ? haversineMeters(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
          : Infinity;
        return distA - distB;
      });
    }
    return matches.slice(0, MAX_SUGGESTIONS);
  }, [branches, searchQuery, userLocation]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleSelectBranch = (branch: BranchSuggestion) => {
    setSearchQuery('');
    // `ts` makes every tap a distinct navigation even when the same branch is picked twice in a
    // row - Book is a tab that stays mounted, and a repeated `q` value alone wouldn't change the
    // prop React sees, so the auto-select effect on the other end would silently never re-fire.
    router.push({ pathname: '/user/(tabs)/book', params: { q: branch.name, ts: String(Date.now()) } });
  };

  return (
    <View className="mb-2">
      {/* Header */}
      <View
        className="bg-[#F9EF08] px-5 pt-4 rounded-b-2xl"
        style={{ paddingBottom: SEARCH_BAR_GAP + BANNER_OVERLAP }}
      >
        {/* Top row: greeting + notification + logo */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <Text className="text-[13px] font-medium text-[#1A1A00]/70">{getGreeting()},</Text>
            <Text className="text-[22px] font-bold text-[#1A1A00]" numberOfLines={1}>
              {firstName || 'there'}
            </Text>
          </View>
          <View className="flex-row items-center">
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
            <Image
              source={require('../../../../assets/images/ndcwlogo.png')}
              className="w-20 h-14 ml-3"
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Search bar - matches the Book screen's branch search styling */}
        <View
          className="flex-row items-center bg-[#FAFAFA] border border-[#EEEEEE] px-3 py-2 rounded-full"
        >
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            placeholder="Search for a branch..."
            placeholderTextColor="#666"
            className="flex-1 ml-2 text-[14px] text-[#333]"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              className="ml-1 p-1"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#C4C4C4" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search suggestions */}
      {searchQuery.trim().length > 0 && (
        <View
          className="absolute z-50 left-5 right-5 bg-white border border-[#EEEEEE] rounded-2xl overflow-hidden"
          style={{
            top: 142,
            maxHeight: 280,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          {matchedBranches.length === 0 ? (
            <View className="px-5 py-4">
              <Text className="text-gray-500 text-[14px]">No branches found</Text>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {matchedBranches.map((branch, i) => {
                const distanceText =
                  userLocation && branch.latitude !== undefined && branch.longitude !== undefined
                    ? formatDistance(
                        haversineMeters(userLocation.latitude, userLocation.longitude, branch.latitude, branch.longitude)
                      )
                    : null;
                return (
                  <TouchableOpacity
                    key={branch.id}
                    className={`px-5 py-3.5 flex-row items-start justify-between ${i < matchedBranches.length - 1 ? 'border-b border-gray-100' : ''}`}
                    onPress={() => handleSelectBranch(branch)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-1 mr-3">
                      <Text className="text-[14px] font-semibold text-[#1A1A1A]" numberOfLines={1}>
                        {branch.name}
                      </Text>
                      {!!branch.address && (
                        <Text className="text-[12px] text-gray-500 mt-0.5" numberOfLines={1}>
                          {branch.address}
                        </Text>
                      )}
                    </View>
                    {distanceText && (
                      <Text className="text-[11px] font-semibold text-gray-400">{distanceText}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Promotional banner — overlaps the header bottom by half its own height */}
      <View className="px-5 z-30" style={{ marginTop: -BANNER_OVERLAP }}>
        <PromotionalBanner />
      </View>
    </View>
  );
}
