import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from "firebase/auth";
import { get, getDatabase, ref, set } from "firebase/database";
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehicleSuccessPanel from './VehicleSuccessPanel';

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

export default function AddVehicle() {
  const [vehicleName, setVehicleName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<VehicleClassification | null>(null);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [showSuccessPanel, setShowSuccessPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBack = () => router.back();

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'sedan': return require('../../../../assets/images/sedan.png');
      case 'suv': return require('../../../../assets/images/suv.png');
      case 'pickup': return require('../../../../assets/images/pickup.png');
      case 'motorcycle-small': return require('../../../../assets/images/motorcycle_small.png');
      case 'motorcycle-large': return require('../../../../assets/images/motorcycle_large.png');
      default: return require('../../../../assets/images/sedan.png');
    }
  };

  const handleClassificationSelect = (classification: VehicleClassification) => {
    setSelectedClassification(classification);
    setShowClassificationModal(false);
  };

  const handleSave = async () => {
    if (!vehicleName.trim() || !plateNumber.trim() || !selectedClassification) {
      Alert.alert("Error", "Please fill all fields and select a vehicle classification.");
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert("Error", "User not authenticated.");
        return;
      }

      const db = getDatabase();
      const normalizedPlate = plateNumber.toUpperCase();
      const vehicleRef = ref(db, `users/${userId}/Vehicle Information/${normalizedPlate}`);

      // 🔒 Check if the plate number already exists
      const snapshot = await get(vehicleRef);
      if (snapshot.exists()) {
        Alert.alert("Error", `Vehicle with plate number ${normalizedPlate} already exists.`);
        return;
      }

      // ✅ Save vehicle using plate number as key
      await set(vehicleRef, {
        vname: vehicleName,
        vplateNumber: normalizedPlate,
        vtype: selectedClassification.id
      });

      setShowSuccessPanel(true);
    } catch (err) {
      console.error("Failed to add vehicle:", err);
      Alert.alert("Error", "Failed to add vehicle.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessContinue = () => router.back();

  if (showSuccessPanel) {
    return (
      <VehicleSuccessPanel
        message="Vehicle has been added successfully!"
        onContinue={handleSuccessContinue}
        iconType="success"
      />
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100 justify-center items-center">
        <ActivityIndicator size="large" color="#F9EF08" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center" onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Add Vehicle</Text>
          <View className="w-10" />
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 p-6">
        {/* Classification */}
        <View className="mb-6 relative">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Vehicle Classification</Text>
          <TouchableOpacity
            key={selectedClassification?.id || 'empty'}
            className="bg-white border border-gray-300 rounded-xl px-4 py-4 flex-row items-center justify-between"
            onPress={() => setShowClassificationModal(true)}
          >
            {selectedClassification ? (
              <View className="flex-1 flex-row items-center">
                <Image source={getVehicleIcon(selectedClassification.id)} className="w-8 h-8 mr-4" resizeMode="contain" />
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">{selectedClassification.name}</Text>
                  <Text className="text-sm text-gray-500 mt-1">{selectedClassification.examples || selectedClassification.details}</Text>
                </View>
              </View>
            ) : (
              <Text className="text-lg text-gray-500">Choose Classification</Text>
            )}
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <Modal
            visible={showClassificationModal}
            transparent={true}
            animationType="none"
            onRequestClose={() => setShowClassificationModal(false)}
          >
            <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setShowClassificationModal(false)}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} className="absolute left-6 right-6 bg-white rounded-xl shadow-lg border border-gray-200 mt-2" style={{ top: 185 }}>
                <ScrollView scrollEnabled={vehicleClassifications.length > 5} nestedScrollEnabled={true}>
                  {vehicleClassifications.map((c, index) => (
                    <TouchableOpacity
                      key={c.id}
                      className={`flex-row items-center p-4 ${index < vehicleClassifications.length - 1 ? 'border-b border-gray-200' : ''}`}
                      onPress={() => handleClassificationSelect(c)}
                    >
                      <Image source={getVehicleIcon(c.id)} className="w-8 h-8 mr-4" resizeMode="contain" />
                      <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-800">{c.name}</Text>
                        <Text className="text-sm text-gray-500 mt-1">{c.examples || c.details}</Text>
                      </View>
                      {selectedClassification?.id === c.id && <Ionicons name="checkmark" size={24} color="#F9EF08" />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
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

      {/* Save Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-16 h-16 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
        onPress={handleSave}
      >
        <Ionicons name="checkmark" size={40} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
