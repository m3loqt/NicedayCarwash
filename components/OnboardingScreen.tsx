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
    title: 'Book with ease!',
    description: 'Schedule your car wash service in just a few taps',
    image: require('../assets/images/intro1.png'),
  },
  {
    id: 3,
    title: 'Track your bookings!',
    description: 'Monitor your service history and upcoming appointments',
    image: require('../assets/images/intro1.png'),
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
        <TouchableOpacity onPress={() => onComplete?.()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-[13px] text-[#999]">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Illustration */}
      <View className="flex-1 items-center justify-center px-8">
        <Image
          source={step.image}
          style={{ width: 280, height: 280 }}
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
              className="w-12 h-12 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color="#1A1A1A" />
            </TouchableOpacity>
          )}

          {/* Next / Get Started */}
          <TouchableOpacity
            onPress={handleNext}
            className="flex-1 bg-[#F9EF08] rounded-2xl py-3.5 items-center"
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
