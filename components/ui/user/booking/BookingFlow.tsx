import { useAlert } from '@/hooks/use-alert';
import { useTabBarVisibility } from '@/hooks/use-tab-bar-visibility';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  status: 'Open' | 'Closed';
  coordinates: { latitude: number; longitude: number };
}

export default function BookingFlow({ branch, onClose }: { branch: Branch | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { alert, AlertComponent } = useAlert();
  const { hideTabBar, showTabBar } = useTabBarVisibility();
  const [step, setStep] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<any[]>([]);
  const [dateTime, setDateTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  const [totalEstimatedTime, setTotalEstimatedTime] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // Nav bar stays hidden for the whole booking flow (select vehicle -> plan -> review),
  // and reappears once this overlay unmounts back to the branch list.
  useEffect(() => {
    hideTabBar();
    return () => showTabBar();
  }, [hideTabBar, showTabBar]);

  // The Android hardware back button must walk this overlay's own steps (and close it at
  // step 1) instead of bubbling to the tab navigator - otherwise the flow stays mounted with
  // the tab bar hidden while the user is dumped onto another tab.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 1) onClose();
      else setStep((s) => Math.max(1, s - 1));
      return true;
    });
    return () => sub.remove();
  }, [step, onClose]);

  // Exit early if no branch is provided
  if (!branch) {
    return null;
  }

const handleNext = (data?: any, vehicleOverride?: any) => {
  const activeVehicle = vehicleOverride ?? selectedVehicle;
  if (step === 1 && !activeVehicle) {
    alert('Select Vehicle', 'Please select or add a vehicle before continuing.');
    return;
  }

  // Capture service selections from step 2 and move to confirmation step
  if (step === 2) {
    if (data) {
      setSelectedServices(data.services ?? []);
      setSelectedAddons(data.addons ?? []);
      setSelectedDate(data.date ?? null);
      setSelectedTimeSlot(data.timeSlot ?? null);
      setTotalEstimatedTime(data.totalEstimatedTime ?? 0);
      setDateTime(data.date && data.timeSlot ? `${data.date.toLocaleDateString()} - ${data.timeSlot.time}` : null);
      setPaymentMethod(data.paymentMethod ?? null);
      setStep(3);
    }
    return;
  }

  setStep((s) => Math.min(3, s + 1));
};

  const handleBack = () => {
    if (step === 1) return onClose();
    setStep((s) => Math.max(1, s - 1));
  };

  return (
    <View className="absolute bg-white" style={{ top: -insets.top, left: 0, right: 0, bottom: 0 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header + segmented progress line (aligned with Select branch) */}
      <View className="bg-white pb-0" style={{ paddingTop: insets.top + 16 }}>
        {/* Title row */}
        <View className="px-5 flex-row items-center mb-3">
          <TouchableOpacity
            onPress={handleBack}
            className="mr-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-[#1A1A1A] mb-1 flex-1">
            {step === 1 ? 'Select vehicle' : step === 2 ? 'Select plan' : 'Review booking'}
          </Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Segmented progress bar: 3 equal parts across full width */}
        <View className="flex-row w-full h-[2px]">
          <View className={`flex-1 ${step >= 1 ? 'bg-[#F9EF08]' : 'bg-[#E5E5E5]'}`} />
          <View className={`flex-1 ${step >= 2 ? 'bg-[#F9EF08]' : 'bg-[#E5E5E5]'}`} />
          <View className={`flex-1 ${step >= 3 ? 'bg-[#F9EF08]' : 'bg-[#E5E5E5]'}`} />
        </View>
      </View>

      {/* Steps */}
      {step === 1 && (
        <ChooseVehicleStep
          selectedVehicle={selectedVehicle}
          onSelectVehicle={(v: any) => {
            setSelectedVehicle(v);
            handleNext(undefined, v);
          }}
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

      {step === 2 && branch && (
        <ServicesStep
          branchId={branch.id}
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
          date={selectedDate}
          timeSlot={selectedTimeSlot}
          totalEstimatedTime={totalEstimatedTime}
          paymentMethod={paymentMethod}
          onBack={handleBack}
          onDone={() => {
            // Tear the overlay down (restores the tab bar via this effect's cleanup, and stops a
            // stale step-3 flow lingering on the Book tab) before switching tabs.
            showTabBar();
            onClose();
            router.replace('/user/(tabs)/history');
          }}
        />
      )}

      {AlertComponent}
    </View>
  );
}
