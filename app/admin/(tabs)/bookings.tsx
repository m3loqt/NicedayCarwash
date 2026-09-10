import {
  AppointmentsHeader,
  AppointmentsList,
  AppointmentsSearchBar,
  AppointmentsTabs,
} from '@/components/ui/admin/appointments';
import { useBranchBookingCounts } from '@/hooks/use-branch-booking-counts';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VALID_TABS = ['pending', 'confirmed', 'ongoing', 'history'] as const;

export default function AdminBookingsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const counts = useBranchBookingCounts();

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

        {/* Header + Search */}
        <View className="bg-white pb-4">
          <AppointmentsHeader />
          <AppointmentsSearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </View>

        {/* Status Tabs */}
        <AppointmentsTabs activeTab={activeTab} onTabChange={handleTabChange} counts={counts} />

        {/* Content */}
        <View className="flex-1 bg-[#FAFAFA]">
          <AppointmentsList activeTab={activeTab} searchQuery={searchQuery} />
        </View>
      </SafeAreaView>
    </View>
  );
}
