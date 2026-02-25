import { useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HistoryHeader from '../../../components/ui/user/history/HistoryHeader';
import HistoryList from '../../../components/ui/user/history/HistoryList';
import HistoryTabs from '../../../components/ui/user/history/HistoryTabs';

export default function UserHistoryScreen() {
  const [activeTab, setActiveTab] = useState('pending');

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <HistoryHeader />
        <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <HistoryList activeTab={activeTab} />
      </SafeAreaView>
    </View>
  );
}
