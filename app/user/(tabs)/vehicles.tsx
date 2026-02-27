import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehiclesHeader from '../../../components/ui/user/vehicles/VehiclesHeader';
import VehiclesList from '../../../components/ui/user/vehicles/VehiclesList';

export default function VehiclesScreen() {
  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <VehiclesHeader />
        <VehiclesList />
      </SafeAreaView>
    </View>
  );
}
