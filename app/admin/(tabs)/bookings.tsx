import {
  AppointmentsHeader,
  AppointmentsList,
  AppointmentsSearchBar,
  AppointmentsTabs,
} from '@/components/ui/admin/appointments';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VALID_TABS = ['pending', 'confirmed', 'completed', 'cancelled'] as const;
// const VALID_TABS = ['pending', 'ongoing', 'completed', 'cancelled'] as const;

export default function AdminBookingsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const tab = params.tab;
    if (tab && VALID_TABS.includes(tab as (typeof VALID_TABS)[number])) {
      setActiveTab(tab);
    }
  }, [params.tab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <AppointmentsHeader />

        {/* Status Tabs */}
        <AppointmentsTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Content */}
        <View className="flex-1 bg-white">
          <AppointmentsSearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <AppointmentsList activeTab={activeTab} searchQuery={searchQuery} />
        </View>
      </SafeAreaView>
    </View>
  );
}
