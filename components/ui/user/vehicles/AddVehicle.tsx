import { useAlert } from '@/hooks/use-alert';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { get, getDatabase, ref, set } from 'firebase/database';
import { useState } from 'react';
import {
  ActivityIndicator,
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
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!vehicleName.trim() || !plateNumber.trim() || !selectedType) {
      Alert.alert('Error', 'Please fill all fields and select a vehicle type.');
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated.');
        return;
      }

      const db = getDatabase();
      const normalizedPlate = plateNumber.toUpperCase();
      const vehicleRef = ref(db, `users/${userId}/Vehicle Information/${normalizedPlate}`);

      const snapshot = await get(vehicleRef);
      if (snapshot.exists()) {
        Alert.alert('Error', `Vehicle with plate number ${normalizedPlate} already exists.`);
        return;
      }

      await set(vehicleRef, {
        vname: vehicleName,
        vplateNumber: normalizedPlate,
        vtype: selectedType,
      });

      setShowSuccess(true);
    } catch (err) {
      console.error('Failed to add vehicle:', err);
      Alert.alert('Error', 'Failed to add vehicle.');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="small" color="#1A1A1A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
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
                  className={`items-center mr-2.5 rounded-2xl px-5 py-4 border ${
                    isSelected ? 'border-[#F9EF08] bg-[#FFFEF0]' : 'border-[#EEEEEE] bg-[#FAFAFA]'
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
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A]"
              placeholder="e.g. Toyota Vios"
              placeholderTextColor="#BDBDBD"
              value={vehicleName}
              onChangeText={setVehicleName}
            />
          </View>
          <View className="mb-4">
            <Text className="text-[13px] text-[#999] mb-1.5">Plate Number</Text>
            <TextInput
              className="bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl px-4 py-4 text-[15px] text-[#1A1A1A]"
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
      <View className="px-5 pb-8 pt-3 bg-white">
        <TouchableOpacity
          className="bg-[#F9EF08] rounded-2xl py-4 items-center"
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text className="text-[#1A1A00] text-[15px] font-bold">Add Vehicle</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
