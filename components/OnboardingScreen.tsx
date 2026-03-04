import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  image: any;
}

interface OnboardingScreenProps {
  onComplete?: () => void;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Streamline your day!',
    description: 'Prioritize your time with easy appointments',
    image: require('../assets/images/intro1.png'),
  },
  {
    id: 2,
    title: 'Skip the wait',
    description: 'Book ahead and arrive when your slot is ready.',
    image: require('../assets/images/skip.png'),
  },
  {
    id: 3,
    title: 'Track your service',
    description: 'Get real time updates from booking to wash completion.',
    image: require('../assets/images/progress.png'),
  },
];

const isLast = (step: number) => step === onboardingSteps.length - 1;

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (!isLast(currentStep)) {
      setCurrentStep(s => s + 1);
    } else {
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const step = onboardingSteps[currentStep];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Skip */}
      <View className="flex-row justify-end px-6 pt-2 pb-0">
        <TouchableOpacity
          onPress={() => onComplete?.()}
          className="py-3 px-4"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Text className="text-[17px] font-semibold text-[#999]">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Illustration — larger for steps 2 and 3 */}
      <View className="flex-1 items-center justify-center px-8">
        <Image
          source={step.image}
          style={{
            width: currentStep >= 1 ? 340 : 280,
            height: currentStep >= 1 ? 340 : 280,
          }}
          resizeMode="contain"
        />
      </View>

      {/* Text + dots + buttons */}
      <View className="px-6 pb-6">

        {/* Dots */}
        <View className="flex-row justify-center mb-6">
          {onboardingSteps.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentStep ? 20 : 8,
                height: 8,
                borderRadius: 4,
                marginHorizontal: 3,
                backgroundColor: i === currentStep ? '#F9EF08' : '#E5E5E5',
              }}
            />
          ))}
        </View>

        {/* Title */}
        <Text className="text-[22px] font-bold text-[#1A1A1A] text-center mb-2">
          {step.title}
        </Text>

        {/* Description */}
        <Text className="text-[13px] text-[#999] text-center leading-5 mb-8">
          {step.description}
        </Text>

        {/* Buttons */}
        <View className="flex-row items-center gap-3">
          {/* Back button — only shown after first step */}
          {currentStep > 0 && (
            <TouchableOpacity
              onPress={handlePrevious}
              className="w-14 min-h-[56px] rounded-lg bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={26} color="#1A1A1A" />
            </TouchableOpacity>
          )}

          {/* Next / Get Started */}
          <TouchableOpacity
            onPress={handleNext}
            className="flex-1 bg-[#F9EF08] rounded-lg min-h-[52px] py-4 items-center justify-center"
            activeOpacity={0.85}
          >
            <Text className="text-[14px] font-bold text-[#1A1A00]">
              {isLast(currentStep) ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}
