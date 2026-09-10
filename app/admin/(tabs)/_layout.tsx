import AdminCustomTabBar from '@/components/ui/admin/CustomTabBar';
import { Tabs } from 'expo-router';

export default function AdminTabLayout() {
  return (
    <Tabs
      initialRouteName="bookings"
      tabBar={(props) => <AdminCustomTabBar {...props} />}
      screenOptions={{
        lazy: true,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="bookings" options={{ title: 'Bookings' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="services" options={{ title: 'Services' }} />
      <Tabs.Screen name="settings" options={{ title: 'Overview' }} />
    </Tabs>
  );
}
