import { useAlert } from '@/hooks/use-alert';
import { logError } from '@/lib/logger';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, onValue, ref, set } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ImageSourcePropType,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import VehicleSuccessPanel from './VehicleSuccessPanel';

interface VehicleType {
  id: string;
  label: string;
  image: ImageSourcePropType;
}

const vehicleTypes: VehicleType[] = [
  { id: 'sedan', label: 'Sedan', image: require('../../../../assets/images/sedan.png') },
  { id: 'suv', label: 'SUV', image: require('../../../../assets/images/suv.png') },
  { id: 'pickup', label: 'Pickup', image: require('../../../../assets/images/pickup.png') },
  { id: 'motorcycle-small', label: 'Moto (S)', image: require('../../../../assets/images/motosmall.png') },
  { id: 'motorcycle-large', label: 'Moto (L)', image: require('../../../../assets/images/motobig.png') },
];

export default function AddVehicle() {
  const insets = useSafeAreaInsets();
  const { alert, AlertComponent } = useAlert();
  const [vehicleName, setVehicleName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Existing plate keys, kept live from the local cache so the duplicate check is instant and
  // the Save button never has to wait on the network. `null` until the first snapshot lands.
  const existingPlatesRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const userId = getAuth().currentUser?.uid;
    if (!userId) return;
    const listRef = ref(getDatabase(), `users/${userId}/Vehicle Information`);
    const unsub = onValue(listRef, (snap) => {
      const plates = new Set<string>();
      snap.forEach((child) => {
        if (child.key) plates.add(child.key);
        return false;
      });
      existingPlatesRef.current = plates;
    });
    return () => unsub();
  }, []);

  const handleSave = () => {
    if (!vehicleName.trim() || !plateNumber.trim() || !selectedType) {
      Alert.alert('Error', 'Please fill all fields and select a vehicle type.');
      return;
    }

    const userId = getAuth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    const db = getDatabase();
    const normalizedPlate = plateNumber.trim().toUpperCase();

    // Instant, in-memory duplicate check (skipped only if the list hasn't synced yet - the plate
    // is the write key, so a later re-add just updates that entry rather than duplicating it).
    if (existingPlatesRef.current?.has(normalizedPlate)) {
      Alert.alert('Already added', `You already have a vehicle with plate ${normalizedPlate}. You can edit it from your vehicles list.`);
      return;
    }

    const vehicleRef = ref(db, `users/${userId}/Vehicle Information/${normalizedPlate}`);
    // Optimistic: the RTDB SDK applies this to the local cache synchronously, so the vehicles
    // list (a live listener) shows it right away and this screen can confirm without waiting for
    // the server ACK. The write finishes syncing in the background when the network allows.
    set(vehicleRef, {
      vname: vehicleName.trim(),
      vplateNumber: normalizedPlate,
      vtype: selectedType,
    }).catch((err) => logError('AddVehicle.handleSave.set', err, { context: 'Vehicle write failed to sync' }));

    setShowSuccess(true);
  };

  if (showSuccess) {
    return (
      <VehicleSuccessPanel
        message="Vehicle has been added successfully!"
        onContinue={() => router.back()}
        iconType="success"
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="mr-3"
        >
          <Ionicons name="chevron-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#1A1A1A]">Add Vehicle</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1"
      >
        {/* Type selector */}
        <View className="mb-6">
          <Text className="text-[14px] text-[#999] mb-3 px-5">Select type of vehicle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}>
            {vehicleTypes.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  className={`items-center mr-2.5 rounded-2xl px-5 py-4 ${
                    isSelected ? 'border border-[#F9EF08] bg-[#FFFEF0]' : 'bg-white'
                  }`}
                  style={{ minWidth: 100 }}
                  onPress={() => setSelectedType(type.id)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={type.image}
                    style={{ width: 80, height: 50, marginBottom: -6 }}
                    resizeMode="contain"
                  />
                  <Text
                    className={`text-[13px] mt-1.5 font-semibold ${
                      isSelected ? 'text-[#1A1A1A]' : 'text-[#999]'
                    }`}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Inputs */}
        <View className="px-5">
          <View className="mb-4">
            <Text className="text-[13px] text-[#999] mb-1.5">Vehicle Brand and Model</Text>
            <TextInput
              className="bg-white border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A]"
              placeholder="e.g. Toyota Vios"
              placeholderTextColor="#BDBDBD"
              value={vehicleName}
              onChangeText={setVehicleName}
            />
          </View>
          <View className="mb-4">
            <Text className="text-[13px] text-[#999] mb-1.5">Plate Number</Text>
            <TextInput
              className="bg-white border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A]"
              placeholder="e.g. ABC 1234"
              placeholderTextColor="#BDBDBD"
              value={plateNumber}
              onChangeText={setPlateNumber}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </ScrollView>

      {/* Save button */}
      <View className="px-5 pb-8 pt-3 bg-[#FAFAFA]">
        <TouchableOpacity
          className="bg-[#F9EF08] rounded-2xl py-4 items-center justify-center min-h-[52px]"
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text className="text-[#1A1A00] text-[15px] font-bold">Add Vehicle</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
