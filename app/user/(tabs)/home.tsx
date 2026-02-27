import { ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BranchesSlider from '../../../components/ui/user/home/BranchesSlider';
import HomeHeader from '../../../components/ui/user/home/HomeHeader';
import MemberPromoCard from '../../../components/ui/user/home/MemberPromoCard';

export default function UserHomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#F9EF08" />
      <SafeAreaView className="flex-1 bg-[#F9EF08]" edges={['top']}>
        <ScrollView
          className="bg-white"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <HomeHeader />
          <BranchesSlider />
          {/* <ServicesSlider /> */}
          <MemberPromoCard />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
