import { useLocalSearchParams } from 'expo-router';
import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BranchSelection } from '../../../components/ui/user/booking';

export default function UserBookScreen() {
  const { q, ts } = useLocalSearchParams<{ q?: string; ts?: string }>();
  // react-native-safe-area-context's insets.top can briefly read 0 on this screen's first
  // paint (the header flashing flush against the status bar before settling). See
  // notifications.tsx for the same fix - StatusBar.currentHeight is synchronous on Android.
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <BranchSelection initialQuery={q} initialQueryNonce={ts} />
    </View>
  );
}
