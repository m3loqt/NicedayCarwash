import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
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
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 pt-5 bg-gray-100">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {vehicles.map((v) => {
          const isSelected = selectedVehicle?.vplateNumber === v.vplateNumber;

          return (
            <TouchableOpacity
              className="mx-5 my-2"
              key={v.vplateNumber}
              onPress={() => onSelectVehicle(v)}
            >
              <VehicleCard
                id={v.vplateNumber}
                name={v.vname}
                plateNumber={v.vplateNumber}
                type={v.vtype}
                selected={isSelected}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
