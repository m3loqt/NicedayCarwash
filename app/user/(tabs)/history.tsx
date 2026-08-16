import { useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HistoryHeader from '../../../components/ui/user/history/HistoryHeader';
import HistoryList from '../../../components/ui/user/history/HistoryList';
import HistoryTabs from '../../../components/ui/user/history/HistoryTabs';

export default function UserHistoryScreen() {
  const [activeTab, setActiveTab] = useState('ongoing');

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <SafeAreaView className="flex-1 bg-[#FAFAFA]" edges={['top']}>
        <HistoryHeader />
        <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <HistoryList activeTab={activeTab} />
      </SafeAreaView>
    </View>
  );
}
