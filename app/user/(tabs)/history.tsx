import { useState } from 'react';
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
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <HistoryHeader />
      
      {/* Status Tabs */}
      <HistoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
      
      {/* Search Bar */}
      <HistorySearchBar />
      
      {/* Booking History List */}
      <HistoryList activeTab={activeTab} />
    </SafeAreaView>
  );
}
