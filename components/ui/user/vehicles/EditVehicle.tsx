import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Image,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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
  {
    id: 'sedan',
    name: 'Sedan',
    icon: 'car-sport',
    examples: '(EX: Toyota Vios, Honda City, Toyota Corolla)'
  },
  {
    id: 'suv',
    name: 'SUV',
    icon: 'car-sport',
    examples: '(EX: Toyota Fortuner, Ford Everest, Suzuki Jimny)'
  },
  {
    id: 'pickup',
    name: 'Pick Up',
    icon: 'car-sport',
    examples: '(EX: Toyota Hilux, Ford Ranger, Nissan Navara)'
  },
  {
    id: 'motorcycle-small',
    name: 'Motorcycle Small',
    icon: 'bicycle',
    details: '(399 CC or below)'
  },
  {
    id: 'motorcycle-large',
    name: 'Motorcycle Large',
    icon: 'bicycle',
    details: '(400 CC or above)'
  }
];

interface EditVehicleProps {
  vehicleId: string;
  initialData?: {
    name: string;
    plateNumber: string;
    classification: VehicleClassification;
  };
}

export default function EditVehicle({ vehicleId, initialData }: EditVehicleProps) {
  const [vehicleName, setVehicleName] = useState(initialData?.name || '');
  const [plateNumber, setPlateNumber] = useState(initialData?.plateNumber || '');
  const [selectedClassification, setSelectedClassification] = useState<VehicleClassification | null>(
    initialData?.classification || null
  );
  const [showClassificationModal, setShowClassificationModal] = useState(false);
  const [showSuccessPanel, setShowSuccessPanel] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSave = () => {
    // TODO: Implement update vehicle logic
    console.log('Update vehicle:', {
      id: vehicleId,
      name: vehicleName,
      plateNumber,
      classification: selectedClassification
    });
    
    // Show success panel
    setShowSuccessPanel(true);
  };

  const handleSuccessContinue = () => {
    // Navigate back to vehicles list
    router.back();
  };

  const handleClassificationSelect = (classification: VehicleClassification) => {
    setSelectedClassification(classification);
    setShowClassificationModal(false);
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'sedan':
        return require('../../../../assets/images/sedan.png');
      case 'suv':
        return require('../../../../assets/images/suv.png');
      case 'pickup':
        return require('../../../../assets/images/pickup.png');
      case 'motorcycle-small':
      case 'motorcycle-large':
        return require('../../../../assets/images/motorcycle_small.png');
      default:
        return require('../../../../assets/images/sedan.png');
    }
  };

  // Show success panel if needed
  if (showSuccessPanel) {
    return (
      <VehicleSuccessPanel
        message="Vehicle has been edited successfully!"
        onContinue={handleSuccessContinue}
        iconType="success"
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
          
          <Text className="text-xl font-bold text-gray-900">Edit Vehicle</Text>
          
          <View className="w-10" />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1 p-6">
        {/* Vehicle Name */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Vehicle Name
          </Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800"
            placeholder="Enter vehicle name"
            placeholderTextColor="#999"
            value={vehicleName}
            onChangeText={setVehicleName}
          />
        </View>

        {/* Plate Number */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Plate Number
          </Text>
          <TextInput
            className="bg-white border border-gray-300 rounded-xl px-4 py-4 text-lg text-gray-800"
            placeholder="Enter plate number"
            placeholderTextColor="#999"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
          />
        </View>

        {/* Vehicle Classification */}
        <View className="mb-6 relative">
          <Text className="text-lg font-semibold text-gray-800 mb-3">
            Vehicle Classification
          </Text>
          <TouchableOpacity
            className="bg-white border border-gray-300 rounded-xl px-4 py-4 flex-row items-center justify-between"
            onPress={() => setShowClassificationModal(true)}
          >
            <View className="flex-row items-center">
              {selectedClassification ? (
                <>
                  <Image
                    source={getVehicleIcon(selectedClassification.id)}
                    className="w-6 h-6 mr-3"
                    resizeMode="contain"
                  />
                  <Text className="text-lg text-gray-800">
                    {selectedClassification.name}
                  </Text>
                </>
              ) : (
                <Text className="text-lg text-gray-500">
                  Choose Classification
                </Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {/* Dropdown Overlay */}
          {showClassificationModal && (
            <View className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-xl shadow-lg border border-gray-200">
              {vehicleClassifications.map((classification, index) => (
                <TouchableOpacity
                  key={classification.id}
                  className={`flex-row items-center p-4 ${
                    index < vehicleClassifications.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                  onPress={() => handleClassificationSelect(classification)}
                >
                  <Image
                    source={getVehicleIcon(classification.id)}
                    className="w-8 h-8 mr-4"
                    resizeMode="contain"
                  />
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800">
                      {classification.name}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      {classification.examples || classification.details}
                    </Text>
                  </View>
                  {selectedClassification?.id === classification.id && (
                    <Ionicons name="checkmark" size={24} color="#F9EF08" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-16 h-16 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
        onPress={handleSave}
      >
        <Image
          source={require('../../../../assets/images/checkicon.png')}
          className="w-8 h-8"
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Backdrop for dropdown */}
      {showClassificationModal && (
        <TouchableOpacity
          className="absolute inset-0 bg-transparent z-40"
          onPress={() => setShowClassificationModal(false)}
        />
      )}
    </SafeAreaView>
  );
}
