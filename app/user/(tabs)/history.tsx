import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StatusBar, TouchableOpacity, Text, View } from 'react-native';
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

        {/* Cancelled bookings — only visible on Completed tab */}
        {activeTab === 'completed' && <TouchableOpacity
          className="flex-row items-center justify-between mx-4 mb-3 px-4 py-3.5 rounded-2xl bg-[#FAFAFA] border border-[#F0F0F0]"
          onPress={() => router.push('/user/cancelled-bookings' as any)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-xl bg-white border border-[#EEEEEE] items-center justify-center mr-3">
              <Ionicons name="close-circle-outline" size={17} color="#BDBDBD" />
            </View>
            <Text className="text-[13px] font-semibold text-[#1A1A1A]">Cancelled Bookings</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
        </TouchableOpacity>}
      </SafeAreaView>
    </View>
  );
}
