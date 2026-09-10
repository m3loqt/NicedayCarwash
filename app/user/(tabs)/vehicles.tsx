import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VehiclesHeader from '../../../components/ui/user/vehicles/VehiclesHeader';
import VehiclesList from '../../../components/ui/user/vehicles/VehiclesList';

export default function VehiclesScreen() {
  // react-native-safe-area-context's insets.top can briefly read 0 on this screen's first
  // paint (the header flashing flush against the status bar before settling). See
  // notifications.tsx for the same fix - StatusBar.currentHeight is synchronous on Android.
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;

  return (
    <View className="flex-1 bg-[#FAFAFA]" style={{ paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <VehiclesHeader />
      <VehiclesList />
    </View>
  );
}
