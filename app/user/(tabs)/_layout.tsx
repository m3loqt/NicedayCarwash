import { Tabs } from 'expo-router';

import { CustomTabIcon } from '@/components/CustomTabIcon';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function UserTabLayout() {
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
        name="home"
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
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon 
              source={require('../../../assets/images/history_icon_bot.png')} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Booking',
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon 
              source={require('../../../assets/images/add_event_icon.png')} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ focused }) => (
            <CustomTabIcon 
              source={require('../../../assets/images/vehicles.png')} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
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
