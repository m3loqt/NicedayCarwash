import CenteredInfoModal from '@/components/ui/common/CenteredInfoModal';
import CustomTabBar from '@/components/ui/user/CustomTabBar';
import { TabBarVisibilityProvider } from '@/hooks/use-tab-bar-visibility';
import { ANDROID_KEEP_OPEN_HINT, PUSH_HINT_PENDING_KEY, PUSH_HINT_SEEN_KEY } from '@/lib/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Tabs } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';

const PUSH_HINT_DELAY_MS = 1800;

export default function UserTabLayout() {
  const [pushHintVisible, setPushHintVisible] = useState(false);
  // This layout is focused once per return trip into the tabs (from booking-success or
  // elsewhere in the /user stack), not on every switch between tabs within it - guards against
  // firing the check twice if focus re-fires before the first pass has cleared the flag.
  const checkingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // useFocusEffect can fire more than once per transition into this layout - the ref (not
      // React state, so it's readable synchronously before any await) makes sure only one check
      // is ever in flight, and the pending flag being consumed makes a second one a no-op anyway.
      if (Platform.OS !== 'android' || checkingRef.current) return;
      checkingRef.current = true;

      (async () => {
        try {
          const pending = await AsyncStorage.getItem(PUSH_HINT_PENDING_KEY);
          if (!pending) return;
          await AsyncStorage.removeItem(PUSH_HINT_PENDING_KEY);

          await new Promise((resolve) => setTimeout(resolve, PUSH_HINT_DELAY_MS));

          const [{ status }, alreadySeen] = await Promise.all([
            Notifications.getPermissionsAsync(),
            AsyncStorage.getItem(PUSH_HINT_SEEN_KEY),
          ]);
          if (status === 'granted' && !alreadySeen) {
            setPushHintVisible(true);
            await AsyncStorage.setItem(PUSH_HINT_SEEN_KEY, 'true');
          }
        } finally {
          checkingRef.current = false;
        }
      })();
    }, [])
  );

  return (
    <TabBarVisibilityProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          lazy: true,
          headerShown: false,
        }}
      >
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
        <Tabs.Screen name="book" options={{ title: 'Book' }} />
        <Tabs.Screen name="vehicles" options={{ title: 'Vehicles' }} />
        <Tabs.Screen name="profile" options={{ title: 'Account' }} />
      </Tabs>
      <CenteredInfoModal
        visible={pushHintVisible}
        image={require('../../../assets/images/stayintheloop.png')}
        title="Stay in the loop"
        message={ANDROID_KEEP_OPEN_HINT}
        onClose={() => setPushHintVisible(false)}
      />
    </TabBarVisibilityProvider>
  );
}
