import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../../firebase/firebase';

interface Branch {
  id: string;
  name: string;
  address: string;
  status: 'Open' | 'Closed';
}

export default function BranchesSlider() {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    const branchesRef = ref(db, 'Branches');
    const unsubscribe = onValue(branchesRef, (snapshot) => {
      const list: Branch[] = [];
      snapshot.forEach((child) => {
        const profile = child.child('profile').val();
        if (profile && profile.name) {
          list.push({
            id: child.key!,
            name: profile.name,
            address: profile.address || '',
            status: profile.status ?? 'Open',
          });
        }
      });
      setBranches(list);
    });
    return () => unsubscribe();
  }, []);

  if (branches.length === 0) return null;

  return (
    <View className="mt-6">
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
          const isOpen = branch.status === 'Open';
          return (
            <TouchableOpacity
              key={branch.id}
              className={`bg-[#FAFAFA] rounded-2xl border border-[#EEEEEE] ${index < branches.length - 1 ? 'mr-4' : ''}`}
              style={{ width: 220 }}
              onPress={() => router.push('/user/(tabs)/book')}
              activeOpacity={0.82}
            >
              {/* Image with inner padding */}
              <View className="p-2.5 pb-0">
                <View className="rounded-xl overflow-hidden">
                  <Image
                    source={require('../../../../assets/images/branch1.jpg')}
                    className="w-full"
                    style={{ height: 115 }}
                    resizeMode="cover"
                  />
                  {/* Status badge on image */}
                  <View
                    className="absolute top-2 left-2 flex-row items-center rounded-full px-2.5 py-1"
                    style={{ backgroundColor: isOpen ? '#F9EF08' : '#EF4444' }}
                  >
                    <View
                      className="w-1.5 h-1.5 rounded-full mr-1.5"
                      style={{ backgroundColor: isOpen ? '#1A1A00' : '#FFFFFF' }}
                    />
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: isOpen ? '#1A1A00' : '#FFFFFF' }}
                    >
                      {branch.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Content */}
              <View className="px-3.5 pt-3 pb-3.5">
                <Text className="text-[14px] font-bold text-[#1A1A1A] mb-0.5">{branch.name}</Text>
                <Text className="text-[11px] text-[#999] leading-[15px]" numberOfLines={2}>
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
