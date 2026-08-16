import ActiveBookingBar from '@/components/ui/user/ActiveBookingBar';
import { useTabBarClearance } from '@/hooks/use-tab-bar-height';
import { ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BranchesSlider from '../../../components/ui/user/home/BranchesSlider';
import HomeHeader from '../../../components/ui/user/home/HomeHeader';
import ServicesQuickAccess from '../../../components/ui/user/home/ServicesSlider';

export default function UserHomeScreen() {
  const tabBarClearance = useTabBarClearance();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#F9EF08" />
      <SafeAreaView className="flex-1 bg-[#F9EF08]" edges={['top']}>
        <ScrollView
          className="bg-white"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: tabBarClearance }}
        >
          <HomeHeader />
          <ServicesQuickAccess />
          <BranchesSlider />
        </ScrollView>
      </SafeAreaView>
      <ActiveBookingBar />
    </View>
  );
}
