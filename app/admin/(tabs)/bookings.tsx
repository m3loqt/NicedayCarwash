import {
  AppointmentsHeader,
  AppointmentsList,
  AppointmentsSearchBar,
  AppointmentsTabs,
} from '@/components/ui/admin/appointments';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminBookingsScreen() {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: 'white' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: 'white' }} edges={['top']}>
        {/* Header */}
        <AppointmentsHeader />

        {/* Status Tabs */}
        <AppointmentsTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Search Bar */}
        <AppointmentsSearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* Appointments List */}
        <AppointmentsList activeTab={activeTab} searchQuery={searchQuery} />
      </SafeAreaView>
    </View>
  );
}
