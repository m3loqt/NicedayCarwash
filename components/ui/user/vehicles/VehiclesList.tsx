import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref, remove } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
    router.push({ pathname: '/user/edit-vehicle', params: { id } });
  };

  const handleDelete = (plateNumber: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete vehicle ${plateNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const auth = getAuth();
              const userId = auth.currentUser?.uid;
              if (!userId) {
                Alert.alert('Error', 'User not authenticated.');
                return;
              }
              const db = getDatabase();
              const vehicleRef = ref(db, `users/${userId}/Vehicle Information/${plateNumber}`);
              await remove(vehicleRef);
              setVehicles((prev) => prev.filter((v) => v.vplateNumber !== plateNumber));
              setShowDeleteSuccess(true);
            } catch (err) {
              console.error('Failed to delete vehicle:', err);
              Alert.alert('Error', 'Failed to delete vehicle.');
            }
          },
        },
      ],
    );
  };

  const handleAdd = () => {
    router.push('/user/add-vehicle');
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
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="small" color="#1A1A1A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.vplateNumber}
              id={vehicle.vplateNumber}
              name={vehicle.vname}
              plateNumber={vehicle.vplateNumber}
              type={vehicle.vtype}
              onEdit={() => handleEdit(vehicle.vplateNumber)}
              onDelete={() => handleDelete(vehicle.vplateNumber)}
            />
          ))
        ) : (
          <View className="items-center justify-center py-24">
            <Ionicons name="car-outline" size={48} color="#E0E0E0" />
            <Text className="text-base text-[#999] mt-4">No vehicles yet</Text>
            <Text className="text-[13px] text-[#CCC] mt-1">Add your first vehicle below</Text>
          </View>
        )}

        {/* Add vehicle button */}
        <TouchableOpacity
          className="bg-[#F9EF08] rounded-2xl mx-5 mt-3 py-4 items-center"
          onPress={handleAdd}
          activeOpacity={0.85}
        >
          <Text className="text-[#1A1A00] text-[15px] font-bold">Add Vehicle</Text>
        </TouchableOpacity>
      </ScrollView>

      
    </View>
  );
}
