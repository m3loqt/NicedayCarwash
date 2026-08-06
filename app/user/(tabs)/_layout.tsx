import CustomTabBar from '@/components/ui/user/CustomTabBar';
import { TabBarVisibilityProvider } from '@/hooks/use-tab-bar-visibility';
import { Tabs } from 'expo-router';

export default function UserTabLayout() {
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
    </TabBarVisibilityProvider>
  );
}
