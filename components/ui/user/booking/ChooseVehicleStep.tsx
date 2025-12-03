import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import VehicleCard from './VehicleCard';

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
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }} 
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* Section Title */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-xl font-bold text-[#1E1E1E]">Choose Vehicle</Text>
        </View>

        {/* Vehicle List */}
        {vehicles.map((v) => {
          const isSelected = selectedVehicle?.vplateNumber === v.vplateNumber;

          return (
            <Pressable
              className="mx-5 my-2"
              key={v.vplateNumber}
              onPress={() => onSelectVehicle(v)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <VehicleCard
                id={v.vplateNumber}
                name={v.vname}
                plateNumber={v.vplateNumber}
                type={v.vtype}
                selected={isSelected}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
