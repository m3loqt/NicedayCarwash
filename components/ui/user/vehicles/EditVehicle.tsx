import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getAuth } from "firebase/auth";
import { get, getDatabase, ref, update } from "firebase/database";
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehicleSuccessPanel from './VehicleSuccessPanel';
import VehicleClassificationModal from './modals/VehicleClassificationModal';

interface VehicleClassification {
  id: string;
  name: string;
  icon: string;
  examples?: string;
  details?: string;
}

const vehicleClassifications: VehicleClassification[] = [
  { id: 'sedan', name: 'Sedan', icon: 'car-sport', examples: '(EX: Toyota Vios, Honda City)' },
  { id: 'suv', name: 'SUV', icon: 'car-sport', examples: '(EX: Fortuner, Everest)' },
  { id: 'pickup', name: 'Pick Up', icon: 'car-sport', examples: '(EX: Hilux, Ranger)' },
  { id: 'motorcycle-small', name: 'Motorcycle Small', icon: 'bicycle', details: '(399 CC or below)' },
  { id: 'motorcycle-large', name: 'Motorcycle Large', icon: 'bicycle', details: '(400 CC or above)' }
];

export default function EditVehicle() {
  /** GET VEHICLE ID FROM URL PARAM */
  const { id } = useLocalSearchParams();
  const vehicleId = String(id);

  /** STATE */
  const [vehicleName, setVehicleName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<VehicleClassification | null>(null);
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [showSuccessPanel, setShowSuccessPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  /** FETCH VEHICLE DATA */
  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const auth = getAuth();
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const db = getDatabase();
        const vehicleRef = ref(db, `users/${userId}/Vehicle Information/${vehicleId}`);

        const snap = await get(vehicleRef);

        if (snap.exists()) {
          const v = snap.val();

          setVehicleName(v.vname || '');
          setPlateNumber(v.vplateNumber || '');

          const match = vehicleClassifications.find(c => c.id === v.vtype);
          setSelectedClassification(match || null);
        }
      } catch (err) {
        console.error("Error loading vehicle:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [vehicleId]);

  /** SAVE UPDATED DATA */
  const handleSave = async () => {
    try {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      if (!selectedClassification) {
        alert("Please select a vehicle classification");
        return;
      }

      const db = getDatabase();
      const vehicleRef = ref(db, `users/${userId}/Vehicle Information/${vehicleId}`);

      await update(vehicleRef, {
        vname: vehicleName,
        vplateNumber: plateNumber,
        vtype: selectedClassification.id,
      });

      setShowSuccessPanel(true);
    } catch (err) {
      console.error("Failed to update:", err);
      alert("Failed to update vehicle.");
    }
  };

  /** NAVIGATION HANDLERS */
  const handleBack = () => router.back();
  const handleSuccessContinue = () => router.back();

  /** HANDLE CLASSIFICATION SELECT */
  const handleClassificationSelect = (classification: VehicleClassification) => {
    setSelectedClassification(classification);
    setShowClassificationModal(false);
  };

  /** ICON MAPPER */
  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'sedan': return require('../../../../assets/images/sedan.png');
      case 'suv': return require('../../../../assets/images/suv.png');
      case 'pickup': return require('../../../../assets/images/pickup.png');
      case 'motorcycle-small':
      case 'motorcycle-large': return require('../../../../assets/images/motorcycle_small.png');
      default: return require('../../../../assets/images/sedan.png');
    }
  };

  /** SUCCESS SCREEN */
  if (showSuccessPanel) {
    return (
      <VehicleSuccessPanel
        message="Vehicle has been edited successfully!"
        onContinue={handleSuccessContinue}
        iconType="success"
      />
    );
  }

  /** LOADING SCREEN */
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  /** UI */
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* HEADER */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity
            className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-[#1E1E1E]">Edit Vehicle</Text>

          <View className="w-10" />
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView className="flex-1 p-6">

        {/* CLASSIFICATION SELECT */}
        <View className="mb-6 relative">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Vehicle Classification</Text>

          <TouchableOpacity
            className="bg-white border border-gray-300 rounded-xl px-4 py-4 flex-row items-center justify-between"
            onPress={() => setShowClassificationModal(true)}
          >
            <View className="flex-row items-center">
              {selectedClassification ? (
                <>
                  <Image source={getVehicleIcon(selectedClassification.id)} className="w-6 h-6 mr-3" />
                  <Text className="text-lg text-gray-800">{selectedClassification.name}</Text>
                </>
              ) : (
                <Text className="text-lg text-gray-500">Choose Classification</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
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
          />
        </View>

        {/* VEHICLE NAME */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Vehicle Name</Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg"
            placeholder="Enter vehicle name"
            value={vehicleName}
            onChangeText={setVehicleName}
          />
        </View>

        {/* PLATE NUMBER */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Plate Number</Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg"
            placeholder="Enter plate number"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
          />
        </View>

      </ScrollView>

      {/* SAVE BUTTON */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-16 h-16 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
        onPress={handleSave}
      >
        <Ionicons name="checkmark" size={40} color="white" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}
