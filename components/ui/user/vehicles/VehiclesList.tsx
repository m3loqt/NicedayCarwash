import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref, remove } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageSourcePropType,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import VehicleCard from './VehicleCard';
import VehicleSuccessPanel from './VehicleSuccessPanel';

interface VehicleProfile {
  vname: string;
  vplateNumber: string;
  vtype: string;
}

const vehicleImages: Record<string, ImageSourcePropType> = {
  sedan: require('../../../../assets/images/sedan.png'),
  suv: require('../../../../assets/images/suv.png'),
  pickup: require('../../../../assets/images/pickup.png'),
  'motorcycle-small': require('../../../../assets/images/motosmall.png'),
  'motorcycle-large': require('../../../../assets/images/motobig.png'),
};

const vehicleLabels: Record<string, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  pickup: 'Pickup',
  'motorcycle-small': 'Motorcycle (S)',
  'motorcycle-large': 'Motorcycle (L)',
};

export default function VehiclesList() {
  const { alert, AlertComponent } = useAlert();
  const [vehicles, setVehicles] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProfile | null>(null);

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
    setSelectedVehicle(null);
    router.push({ pathname: '/user/edit-vehicle', params: { id } });
  };

  const handleDelete = (plateNumber: string) => {
    setSelectedVehicle(null);
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
              onEdit={() => setSelectedVehicle(vehicle)}
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

        <TouchableOpacity
          className="bg-[#F9EF08] rounded-2xl mx-5 mt-3 py-4 items-center"
          onPress={handleAdd}
          activeOpacity={0.85}
        >
          <Text className="text-[#1A1A00] text-[15px] font-bold">Add Vehicle</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Vehicle action modal */}
      <Modal
        visible={!!selectedVehicle}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedVehicle(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setSelectedVehicle(null)}
          />
          <View className="bg-white rounded-t-3xl px-5 pb-10 pt-3">
            {/* Handle bar */}
            <View className="items-center mb-5">
              <View className="w-10 h-1 rounded-full bg-[#E0E0E0]" />
            </View>

            {/* Vehicle info */}
            {selectedVehicle && (
              <View className="items-center mb-6">
                <Text className="text-xl font-bold text-[#1A1A1A]">
                  {vehicleLabels[selectedVehicle.vtype] || 'Vehicle'}
                </Text>
                <Text className="text-[14px] text-[#999] mt-1">
                  {selectedVehicle.vname} {selectedVehicle.vplateNumber}
                </Text>
              </View>
            )}

            {/* Edit button */}
            <TouchableOpacity
              className="bg-[#F9EF08] rounded-2xl py-4 items-center mb-3"
              onPress={() => selectedVehicle && handleEdit(selectedVehicle.vplateNumber)}
              activeOpacity={0.85}
            >
              <Text className="text-[#1A1A00] text-[15px] font-bold">Edit</Text>
            </TouchableOpacity>

            {/* Delete button */}
            <TouchableOpacity
              className="rounded-2xl py-4 items-center border border-[#EF4444]"
              onPress={() => selectedVehicle && handleDelete(selectedVehicle.vplateNumber)}
              activeOpacity={0.85}
            >
              <Text className="text-[#EF4444] text-[15px] font-bold">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
