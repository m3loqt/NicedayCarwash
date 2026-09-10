import PullToRefresh from '@/components/ui/common/PullToRefresh';
import ActiveBookingBar from '@/components/ui/user/ActiveBookingBar';
import { ACTIVE_BOOKING_BAR_HEIGHT, useActiveBooking } from '@/hooks/use-active-booking';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { useState } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BranchesSlider from '../../../components/ui/user/home/BranchesSlider';
import HomeHeader from '../../../components/ui/user/home/HomeHeader';
import ServicesQuickAccess from '../../../components/ui/user/home/ServicesSlider';

export default function UserHomeScreen() {
  const tabBarClearance = useTabBarClearance();
  const { booking } = useActiveBooking();
  // Bumping this remounts the three data-driven children below, which re-subscribes their
  // Firebase listeners and pulls a fresh snapshot immediately - the actual "refresh" a pull
  // gesture is expected to perform.
  const [refreshKey, setRefreshKey] = useState(0);
  // react-native-safe-area-context's insets.top can briefly read 0 on this screen's first
  // paint (the yellow header flashing flush against the status bar before settling). See
  // notifications.tsx for the same fix - StatusBar.currentHeight is synchronous on Android.
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar barStyle="dark-content" backgroundColor="#F9EF08" />
      <View style={{ flex: 1, backgroundColor: '#F9EF08', paddingTop: topPadding }}>
        <PullToRefresh
          onRefresh={() => setRefreshKey((k) => k + 1)}
          className="bg-[#FAFAFA]"
          showsVerticalScrollIndicator={false}
          bounces
          contentContainerStyle={{
            paddingBottom: tabBarClearance + (booking ? ACTIVE_BOOKING_BAR_HEIGHT : 0),
          }}
        >
          <View key={refreshKey}>
            <HomeHeader />
            <ServicesQuickAccess />
            <BranchesSlider />
          </View>
        </PullToRefresh>
      </View>
      <ActiveBookingBar />
    </View>
  );
}
