import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VehiclesHeader from '../../../components/ui/user/vehicles/VehiclesHeader';
import VehiclesList from '../../../components/ui/user/vehicles/VehiclesList';

export default function VehiclesScreen() {
  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
        <VehiclesHeader />
        <VehiclesList />
      </SafeAreaView>
    </View>
  );
}
