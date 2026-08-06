import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../../firebase/firebase';
import { formatDistance, getCurrentLocation, haversineMeters } from '../../../../lib/location';

interface Branch {
  id: string;
  name: string;
  address: string;
  status: 'Open' | 'Closed';
  latitude?: number;
  longitude?: number;
}

const BRANCH_IMAGES = [
  require('../../../../assets/images/branch1.jpg'),
  require('../../../../assets/images/branch2.jpg'),
  require('../../../../assets/images/branch3.jpg'),
];

export default function BranchesSlider() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const branchesRef = ref(db, 'Branches');
    const unsubscribe = onValue(branchesRef, (snapshot) => {
      const list: Branch[] = [];
      snapshot.forEach((child) => {
        const profile = child.child('profile').val();
        if (profile && profile.name) {
          const lat = Number(profile.latitude);
          const lng = Number(profile.longitude);
          list.push({
            id: child.key!,
            name: profile.name,
            address: profile.address || '',
            status: profile.status ?? 'Open',
            latitude: isFinite(lat) ? lat : undefined,
            longitude: isFinite(lng) ? lng : undefined,
          });
        }
      });
      setBranches(list);
    });
    return () => unsubscribe();
  }, []);

  // Location is requested here (Home), not at app launch - asking in context, only when
  // it's actually needed for something visible (distance to nearby branches), matches
  // platform guidance and the existing pattern already used in the booking flow.
  useEffect(() => {
    getCurrentLocation().then(setUserLocation);
  }, []);

  if (branches.length === 0) return null;

  return (
    <View className="mt-10">
      {/* Section header */}
      <View className="flex-row justify-between items-center px-5 mb-2">
        <Text className="text-lg font-bold text-[#1A1A1A]">Branches near you</Text>
        <TouchableOpacity
          className="flex-row items-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => router.push('/user/(tabs)/book')}
        >
          <Text className="text-sm font-semibold text-[#1A1A1A] mr-1">See All</Text>
          <Ionicons name="chevron-forward" size={14} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        {branches.map((branch, index) => {
          const hasCoords = branch.latitude !== undefined && branch.longitude !== undefined;
          const distanceText =
            userLocation && hasCoords
              ? formatDistance(
                  haversineMeters(userLocation.latitude, userLocation.longitude, branch.latitude!, branch.longitude!)
                )
              : null;

          return (
            <TouchableOpacity
              key={branch.id}
              className={index < branches.length - 1 ? 'mr-4' : ''}
              style={{ width: 220 }}
              onPress={() => router.push('/user/(tabs)/book')}
              activeOpacity={0.82}
            >
              {/* Image */}
              <View className="rounded-lg overflow-hidden">
                <Image
                  source={BRANCH_IMAGES[index % BRANCH_IMAGES.length]}
                  className="w-full"
                  style={{ height: 115 }}
                  resizeMode="cover"
                />
              </View>

              {/* Content */}
              <View className="pt-2.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[14px] font-bold text-[#1A1A1A] mb-0.5 flex-1 mr-2" numberOfLines={1}>
                    {branch.name}
                  </Text>
                  {distanceText ? (
                    <Text className="text-[10px] font-bold text-[#999]" numberOfLines={1}>
                      {distanceText} away
                    </Text>
                  ) : null}
                </View>
                <Text className="text-[11px] text-[#999] leading-[15px]" numberOfLines={1}>
                  {branch.address}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
