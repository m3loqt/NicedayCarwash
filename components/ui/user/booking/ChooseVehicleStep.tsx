import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import VehicleCard from '../vehicles/VehicleCard';

interface VehicleProfile {
  vname: string;
  vplateNumber: string;
  vtype: string;
}

export default function ChooseVehicleStep({ selectedVehicle, onSelectVehicle, onNext }: any) {
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const db = getDatabase();
    const vehicleRef = ref(db, `users/${userId}/Vehicle Information`);

    const unsubscribe = onValue(vehicleRef, (snapshot) => {
      const list: VehicleProfile[] = [];
      snapshot.forEach((child) => {
        const data = child.val();
        if (data) list.push(data);
      });
      setVehicles(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F8F8F8]">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <View className="w-16 h-16 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center mb-4">
          <Ionicons name="car-outline" size={28} color="#BDBDBD" />
        </View>
        <Text className="text-[16px] font-bold text-[#1A1A1A] text-center mb-1">No vehicles yet</Text>
        <Text className="text-[13px] text-[#999] text-center mb-6">
          Add a vehicle to your profile before booking a service.
        </Text>
        <TouchableOpacity
          className="bg-[#F9EF08] rounded-2xl py-3.5 px-8 items-center"
          activeOpacity={0.85}
          onPress={() => router.push('/user/add-vehicle')}
        >
          <Text className="text-[14px] font-bold text-[#1A1A00]">Add Vehicle</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-4">
          {vehicles.map((v) => (
            <View className="my-1" key={v.vplateNumber}>
              <VehicleCard
                id={v.vplateNumber}
                name={v.vname}
                plateNumber={v.vplateNumber}
                type={v.vtype}
                onEdit={() => onSelectVehicle(v)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
