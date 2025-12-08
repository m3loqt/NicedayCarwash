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
      <View className="flex-1 justify-center items-center bg-[#F8F8F8]">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F8F8] px-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ------------------- VEHICLES ------------------- */}
        <Text className="text-xl font-semibold mt-4 mb-3">
          Choose Vehicle
        </Text>

        {/* Vehicle List */}
        {vehicles.map((v) => {
          const isSelected = selectedVehicle?.vplateNumber === v.vplateNumber;

          return (
            <Pressable
              className="mb-4"
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
