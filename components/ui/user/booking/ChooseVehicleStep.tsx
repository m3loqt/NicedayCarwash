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
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {vehicles.map((v) => (
          <TouchableOpacity key={v.vplateNumber} onPress={() => onSelectVehicle(v)}>
            <VehicleCard id={v.vplateNumber} name={v.vname} plateNumber={v.vplateNumber} type={v.vtype as any} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 right-6 w-16 h-16 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push('/user/add-vehicle')}
      >
        <Ionicons name="add" size={36} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        className="absolute bottom-6 left-6 px-6 py-3 bg-white rounded-full border border-gray-200"
        onPress={onNext}
      >
        <Text className="text-gray-700 font-semibold">Next</Text>
      </TouchableOpacity>
    </View>
  );
}
