import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BranchesSlider from '../../../components/ui/user/home/BranchesSlider';
import HomeHeader from '../../../components/ui/user/home/HomeHeader';
import ServicesSlider from '../../../components/ui/user/home/ServicesSlider';

export default function UserHomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with greeting, search, and promotional banner */}
        <HomeHeader />
        
        {/* Branches Slider */}
        <BranchesSlider />
        
        {/* Services Slider */}
        <ServicesSlider />
        
        {/* Bottom padding for tab bar */}
        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
