import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HistoryHeader from '../../../components/ui/user/history/HistoryHeader';
import HistoryList from '../../../components/ui/user/history/HistoryList';
import HistorySearchBar from '../../../components/ui/user/history/HistorySearchBar';
import HistoryTabs from '../../../components/ui/user/history/HistoryTabs';

export default function UserHistoryScreen() {
  const [activeTab, setActiveTab] = useState('pending');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: 'white' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: 'white' }} edges={['top']}>
        {/* Header */}
        <HistoryHeader />
        
        {/* Status Tabs */}
        <HistoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        
        {/* Search Bar */}
        <HistorySearchBar />
        
        {/* Booking History List */}
        <HistoryList activeTab={activeTab} />
      </SafeAreaView>
    </View>
  );
}
