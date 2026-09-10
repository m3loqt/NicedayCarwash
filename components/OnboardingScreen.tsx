import {
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OnboardingScreenProps {
  onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Image + copy, centered as one group */}
      <View className="flex-1 justify-center">
        <Image
          source={require('../assets/images/logins.png')}
          style={{ width: '100%', height: undefined, aspectRatio: 1.4 }}
          resizeMode="cover"
        />

        <View className="px-7 pt-9">
          <Text className="text-[21px] font-inter-bold tracking-tight text-[#1A1A1A] text-center mb-2.5">
            Your car wash, booked in seconds
          </Text>
          <Text className="text-[15px] font-inter-regular tracking-tight text-[#999] text-center leading-[22px]">
            Reserve a slot at your nearest Nice Day Carwash branch and track your
            wash from booking to done. No more waiting in line.
          </Text>
        </View>
      </View>

      {/* CTA */}
      <View className="px-6 pb-6">
        <TouchableOpacity
          onPress={() => onComplete?.()}
          className="bg-[#F9EF08] rounded-full min-h-[52px] py-4 items-center justify-center"
          activeOpacity={0.85}
        >
          <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">
            Get Started
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
