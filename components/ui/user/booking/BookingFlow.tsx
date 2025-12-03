import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Dimensions, Text, TouchableOpacity, View } from 'react-native';
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
    <SafeAreaView className="absolute inset-0 bg-gray-100" edges={['top']}>
      {/* Header */}
      <View className="bg-white pt-5">
        <View className="flex-row items-center justify-between p-4">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white border items-center justify-center" style={{ borderColor: 'rgba(179, 179, 179, 0.20)' }} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#B3B3B3" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-[#1E1E1E]">
            {step === 1 ? 'Choose Vehicle' : step === 2 ? 'Choose Services' : 'Confirmation'}
          </Text>
          {step === 1 ? (
            <TouchableOpacity onPress={() => setShowAddVehicle(true)} className="w-10 h-10 rounded-full bg-white border items-center justify-center" style={{ borderColor: 'rgba(179, 179, 179, 0.20)' }}>
              <Ionicons name="add" size={24} color="#B3B3B3" />
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>
      </View>

      {/* Progress Indicator - Between header and gray background */}
      <View className="bg-white relative" style={{ height: 10, paddingHorizontal: 40 }}>
        {/* Background line - extends to screen edges */}
        <View 
          className="absolute h-[3px] bg-gray-300" 
          style={{ 
            left: 0, 
            right: 0, 
            top: 8, // Center of 20px height container
          }} 
        />
        
        {/* Progress line - fills based on step */}
        <View 
          className="absolute h-[3px] bg-[#F9EF08]" 
          style={{ 
            left: 0, 
            top: 8,
            width: step >= 2 
              ? Dimensions.get('window').width // Full width
              : Dimensions.get('window').width / 2, // Half width
          }} 
        />
        
        {/* Circles container - evenly spaced with padding from edges */}
        <View className="flex-row items-center justify-between" style={{ height: 20 }}>
          {/* Step 1: Branch (always completed) */}
          <View className="w-5 h-5 rounded-full bg-[#F9EF08]" style={{ zIndex: 10 }} />
          
          {/* Step 2: Choose Vehicle */}
          <View 
            className={`w-5 h-5 rounded-full ${step >= 1 ? 'bg-[#F9EF08]' : 'bg-gray-300'}`} 
            style={{ zIndex: 10 }} 
          />
          
          {/* Step 3: Choose Services */}
          <View 
            className={`w-5 h-5 rounded-full ${step >= 2 ? 'bg-[#F9EF08]' : 'bg-gray-300'}`} 
            style={{ zIndex: 10 }} 
          />
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

      {step === 3 && branch && (
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
      {step < 2 && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 w-16 h-16 bg-[#F9EF08] rounded-full shadow-lg"
          onPress={handleNext}
          activeOpacity={0.8}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="chevron-forward" size={46} color="white" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
