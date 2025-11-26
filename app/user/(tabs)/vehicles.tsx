import { SafeAreaView } from 'react-native-safe-area-context';
import VehiclesHeader from '../../../components/ui/user/vehicles/VehiclesHeader';
import VehiclesList from '../../../components/ui/user/vehicles/VehiclesList';

export default function VehiclesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <VehiclesHeader />

      {/* Vehicles List */}
      <VehiclesList />
    </SafeAreaView>
  );
}
