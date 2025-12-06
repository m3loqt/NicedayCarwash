import { Tabs } from 'expo-router';

import { CustomTabIcon } from '@/components/CustomTabIcon';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdminTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#F9EF08', // Yellow for active
        tabBarInactiveTintColor: '#9CA3AF', // Gray for inactive
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 70,
          paddingBottom: 20,
          paddingTop: 10,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon 
              source={require('../../../assets/images/home.png')} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon 
              source={require('../../../assets/images/calendar_icon.png')} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon 
              source={require('../../../assets/images/services.png')} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Account',
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon 
              source={require('../../../assets/images/account.png')} 
              focused={focused} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
