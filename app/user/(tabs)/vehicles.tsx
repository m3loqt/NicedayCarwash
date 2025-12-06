import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehiclesHeader from '../../../components/ui/user/vehicles/VehiclesHeader';
import VehiclesList from '../../../components/ui/user/vehicles/VehiclesList';

export default function VehiclesScreen() {
  return (
    <View className="flex-1" style={{ backgroundColor: 'white' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: 'white' }} edges={['top']}>
        {/* Header */}
        <VehiclesHeader />

        {/* Vehicles List */}
        <VehiclesList />
      </SafeAreaView>
    </View>
  );
}
