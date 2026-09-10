import { useState } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HistoryHeader from '../../../components/ui/user/history/HistoryHeader';
import HistoryList from '../../../components/ui/user/history/HistoryList';
import HistoryTabs from '../../../components/ui/user/history/HistoryTabs';

export default function UserHistoryScreen() {
  const [activeTab, setActiveTab] = useState('ongoing');
  // react-native-safe-area-context's insets.top can briefly read 0 on this screen's first
  // paint (the header flashing flush against the status bar before settling). See
  // notifications.tsx for the same fix - StatusBar.currentHeight is synchronous on Android.
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight ?? 0) : insets.top;

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: topPadding }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header + Tabs */}
      <View className="bg-white">
        <HistoryHeader />
        <HistoryTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      {/* Content */}
      <View className="flex-1 bg-[#FAFAFA]">
        <HistoryList activeTab={activeTab} />
      </View>
    </View>
  );
}
