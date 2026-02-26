import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BranchesSlider from '../../../components/ui/user/home/BranchesSlider';
import HomeHeader from '../../../components/ui/user/home/HomeHeader';
import MemberPromoCard from '../../../components/ui/user/home/MemberPromoCard';
import ServicesSlider from '../../../components/ui/user/home/ServicesSlider';

export default function UserHomeScreen() {
  return (
    <View className="flex-1 bg-white">
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView 
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
