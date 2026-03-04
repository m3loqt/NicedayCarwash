import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import VehicleClassificationModal from '../vehicles/modals/VehicleClassificationModal';

interface VehicleClassification {
  id: string;
  name: string;
  icon: string;
  examples?: string;
  details?: string;
}

const vehicleClassifications: VehicleClassification[] = [
  { id: 'sedan', name: 'Sedan', icon: 'car-sport', examples: '(EX: Toyota Vios, Honda City, Toyota Corolla)' },
  { id: 'suv', name: 'SUV', icon: 'car-sport', examples: '(EX: Toyota Fortuner, Ford Everest, Suzuki Jimny)' },
  { id: 'pickup', name: 'Pick Up', icon: 'car-sport', examples: '(EX: Toyota Hilux, Ford Ranger, Nissan Navara)' },
  { id: 'motorcycle-small', name: 'Motorcycle Small', icon: 'bicycle', details: '(399 CC or below)' },
  { id: 'motorcycle-large', name: 'Motorcycle Large', icon: 'bicycle', details: '(400 CC or above)' }
];

export default function AddVehicleInline({
  visible,
  onClose,
  onSaved
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (vehicle: any) => void;
}) {
  const { alert, AlertComponent } = useAlert();
  const [vehicleName, setVehicleName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<VehicleClassification | null>(null);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'sedan':
        return require('../../../../assets/images/sedan.png');
      case 'suv':
        return require('../../../../assets/images/suv.png');
      case 'pickup':
        return require('../../../../assets/images/pickup.png');
      case 'motorcycle-small':
        return require('../../../../assets/images/motosmall.png');
      case 'motorcycle-large':
        return require('../../../../assets/images/motobig.png');
      default:
        return require('../../../../assets/images/sedan.png');
    }
  };

  const handleClassificationSelect = (classification: VehicleClassification) => {
    setSelectedClassification(classification);
    setShowClassificationModal(false);
  };

  const handleSave = async () => {
    if (!vehicleName.trim() || !plateNumber.trim() || !selectedClassification) {
      alert('Error', 'Please fill all fields and select a vehicle classification.');
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        alert('Error', 'User not authenticated.');
        return;
      }

      const db = getDatabase();
      const normalizedPlate = plateNumber.toUpperCase();
      const vehicleRef = ref(db, `users/${userId}/Vehicle Information/${normalizedPlate}`);

      const snapshot = await get(vehicleRef);
      if (snapshot.exists()) {
        alert('Error', `Vehicle with plate number ${normalizedPlate} already exists.`);
        return;
      }

      const payload = {
        vname: vehicleName,
        vplateNumber: normalizedPlate,
        vtype: selectedClassification.id
      };

      await set(vehicleRef, payload);

      onSaved(payload);
      onClose();
    } catch (err) {
      console.error('Failed to add vehicle:', err);
      alert('Error', 'Failed to add vehicle.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* HEADER */}
        <View className="p-6 border-b border-gray-200">
          <Text className="text-xl font-bold">Add Vehicle</Text>
        </View>

        {/* CONTENT */}
        <ScrollView className="flex-1 p-6 mb-32">
          
          {/* Classification */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Vehicle Classification</Text>

            <TouchableOpacity
              key={selectedClassification?.id || 'empty'}
              className="bg-white border border-gray-300 rounded-xl px-4 py-4 flex-row items-center justify-between"
              onPress={() => setShowClassificationModal(true)}
            >
              {selectedClassification ? (
                <View className="flex-row flex-1 items-center">
                  <Image
                    source={getVehicleIcon(selectedClassification.id)}
                    className="w-8 h-8 mr-4"
                    resizeMode="contain"
                  />
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800">{selectedClassification.name}</Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      {selectedClassification.examples || selectedClassification.details}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-lg text-gray-500">Choose Classification</Text>
              )}
              <Ionicons name="chevron-down" size={22} color="#666" />
            </TouchableOpacity>

            {/* Dropdown Modal */}
            <VehicleClassificationModal
              visible={showClassificationModal}
              classifications={vehicleClassifications}
              selectedClassification={selectedClassification}
              getVehicleIcon={getVehicleIcon}
              onSelect={handleClassificationSelect}
              onClose={() => setShowClassificationModal(false)}
              topPosition={185}
              backdropColor="rgba(0,0,0,0.3)"
            />
          </View>

          {/* Vehicle Name */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Vehicle Name</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800"
              placeholder="Enter vehicle name"
              value={vehicleName}
              onChangeText={setVehicleName}
            />
          </View>

          {/* Plate Number */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-3">Plate Number</Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800"
              placeholder="Enter plate number"
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
            />
          </View>
        </ScrollView>

        {/* BOTTOM BUTTONS */}
        <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="bg-[#F9EF08] py-4 rounded-xl items-center mb-3"
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">Save Vehicle</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="items-center" onPress={onClose}>
            <Text className="text-gray-600 text-lg">Cancel</Text>
          </TouchableOpacity>
        </View>

      </View>
      {AlertComponent}
    </Modal>
  );
}
