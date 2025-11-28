import { router } from 'expo-router';
import { getAuth } from "firebase/auth";
import { getDatabase, onValue, ref, remove } from "firebase/database";
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import VehicleCard from './VehicleCard';
import VehicleSuccessPanel from './VehicleSuccessPanel';

interface VehicleProfile {
  vname: string;
  vplateNumber: string;
  vtype: string;
}

export default function VehiclesList() {
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const db = getDatabase();
    const vehicleRef = ref(db, `users/${userId}/Vehicle Information`);

    // Exactly like Kotlin addValueEventListener
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

const handleEdit = (id: string) => {
  router.push({
    pathname: '/user/edit-vehicle',
    params: { id }
  });
};



const handleDelete = (plateNumber: string) => {
  Alert.alert(
    "Confirm Delete",
    `Are you sure you want to delete vehicle ${plateNumber}?`,
    [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const auth = getAuth();
            const userId = auth.currentUser?.uid;
            if (!userId) {
              Alert.alert("Error", "User not authenticated.");
              return;
            }

            const db = getDatabase();
            const vehicleRef = ref(db, `users/${userId}/Vehicle Information/${plateNumber}`);

            await remove(vehicleRef); // remove vehicle from Firebase

            // Update local state
            setVehicles(prev => prev.filter(v => v.vplateNumber !== plateNumber));

            setShowDeleteSuccess(true);
          } catch (err) {
            console.error("Failed to delete vehicle:", err);
            Alert.alert("Error", "Failed to delete vehicle.");
          }
        }
      }
    ]
  );
};

  if (showDeleteSuccess) {
    return (
      <VehicleSuccessPanel
        message="Vehicle has been removed successfully!"
        onContinue={() => setShowDeleteSuccess(false)}
        iconType="delete"
      />
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="pt-4"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.vplateNumber}
            id={vehicle.vplateNumber}
            name={vehicle.vname}
            plateNumber={vehicle.vplateNumber}
            type={vehicle.vtype}
            onEdit={() => handleEdit(vehicle.vplateNumber)}
            onDelete={() => handleDelete(vehicle.vplateNumber)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
