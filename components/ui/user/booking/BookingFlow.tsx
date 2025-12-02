import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddVehicleInline from './AddVehicleInline';
import ChooseVehicleStep from './ChooseVehicleStep';
import ConfirmationStep from './ConfirmationStep';
import ServicesStep from './ServicesStep';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  distance: string;
  status: 'Open' | 'Closed';
  coordinates: { latitude: number; longitude: number };
}

export default function BookingFlow({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [dateTime, setDateTime] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

const handleNext = (data?: any) => {
  if (step === 1 && !selectedVehicle) {
    Alert.alert('Select Vehicle', 'Please select or add a vehicle before continuing.');
    return;
  }

  // Step 2: Save ServicesStep selections
  if (step === 2 && data) {
    setSelectedServices(data.services ?? []);
    setSelectedAddons(data.addons ?? []);
    setDateTime(data.date ? `${data.date.toLocaleDateString()} - ${data.timeSlot?.time}` : null);
    setPaymentMethod(data.paymentMethod ?? null);
  }

  setStep((s) => Math.min(3, s + 1));
};

  const handleBack = () => {
    if (step === 1) return onClose();
    setStep((s) => Math.max(1, s - 1));
  };

  return (
    <SafeAreaView className="absolute inset-0 bg-white">
      {/* Header */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center" onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">{step === 1 ? 'Choose Vehicle' : step === 2 ? 'Choose Services' : 'Confirmation'}</Text>
          {step === 1 ? (
            <TouchableOpacity onPress={() => setShowAddVehicle(true)} className="w-10 h-10 items-center justify-center">
              <Ionicons name="add" size={24} color="#666" />
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>
      </View>

      {/* Steps */}
      {step === 1 && (
        <ChooseVehicleStep
          selectedVehicle={selectedVehicle}
          onSelectVehicle={(v: any) => setSelectedVehicle(v)}
          onNext={handleNext}
        />
      )}

      <AddVehicleInline
        visible={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSaved={(vehicle: any) => {
          setSelectedVehicle({ vname: vehicle.vname, vplateNumber: vehicle.vplateNumber, vtype: vehicle.vtype });
          setShowAddVehicle(false);
        }}
      />

      {step === 2 && (
        <ServicesStep
          branchId={branch?.id ?? ''}
          selectedVehicle={selectedVehicle}
          onNext={handleNext}
        />
      )}

      {step === 3 && (
        <ConfirmationStep
          branch={branch}
          vehicle={selectedVehicle}
          services={selectedServices}
          addons={selectedAddons}
          dateTime={dateTime}
          paymentMethod={paymentMethod}
          onDone={() => router.replace('/user/(tabs)/history')}
        />
      )}

      {/* Floating Next Button */}
      {step < 3 && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-16 h-16 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
          onPress={handleNext}
        >
          <Ionicons name="chevron-forward" size={36} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
