import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BranchesSlider from '../../../components/ui/user/home/BranchesSlider';
import HomeHeader from '../../../components/ui/user/home/HomeHeader';
import ServicesSlider from '../../../components/ui/user/home/ServicesSlider';

export default function UserHomeScreen() {
  return (
    <View className="flex-1" style={{ backgroundColor: 'white' }}>
      <SafeAreaView className="flex-1" style={{ backgroundColor: 'white' }} edges={['top']}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          bounces={false}
          style={{ backgroundColor: 'white', flex: 1 }}
          contentContainerStyle={{ 
            backgroundColor: 'white', 
            paddingBottom: 80,
            flexGrow: 1 
          }}
        >
          {/* Header with greeting, search, and promotional banner */}
          <HomeHeader />
          
          {/* Branches Slider */}
          <BranchesSlider />
          
          {/* Services Slider */}
          <ServicesSlider />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
