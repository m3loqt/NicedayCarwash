import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
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
