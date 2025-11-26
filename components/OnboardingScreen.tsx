import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Image,
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
    title: "Streamline your day!",
    description: "Prioritize Your Time with Easy Appointments",
    image: require('../assets/images/intro1.png')
  },
  {
    id: 2,
    title: "Book with ease!",
    description: "Schedule your car wash service in just a few taps",
    image: require('../assets/images/intro1.png')
  },
  {
    id: 3,
    title: "Track your bookings!",
    description: "Monitor your service history and upcoming appointments",
    image: require('../assets/images/intro1.png')
  }
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleSkip = () => {
    // TODO: Mark onboarding as completed in storage
    // Call the completion handler instead of navigating
    if (onComplete) {
      onComplete();
    }
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // TODO: Mark onboarding as completed in storage
      // Call the completion handler instead of navigating
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'bottom']}>
      {/* Skip Button */}
      <View className="flex-row justify-end p-4">
        <TouchableOpacity onPress={handleSkip}>
          <Text className="text-lg text-gray-600">Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Illustration */}
        <View className="mb-12">
          <Image
            source={currentStepData.image}
            className="w-80 h-80"
            resizeMode="contain"
          />
        </View>

        {/* Navigation Dots */}
        <View className="flex-row mb-8">
          {onboardingSteps.map((_, index) => (
            <View
              key={index}
              className={`w-3 h-3 rounded-full mx-1 ${
                index === currentStep ? 'bg-[#F9EF08]' : 'bg-gray-300'
              }`}
            />
          ))}
        </View>

        {/* Title */}
        <Text className="text-3xl font-bold text-gray-800 text-center mb-4">
          {currentStepData.title}
        </Text>

        {/* Description */}
        <Text className="text-lg text-gray-600 text-center mb-12">
          {currentStepData.description}
        </Text>
      </View>

      {/* Navigation Buttons */}
      <View className="flex-row items-center justify-between p-6">
        {/* Previous Button (only show if not first step) */}
        {currentStep > 0 ? (
          <TouchableOpacity
            className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center"
            onPress={handlePrevious}
          >
            <Ionicons name="arrow-back" size={24} color="#666" />
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}

        {/* Next Button */}
        <TouchableOpacity
          className="w-16 h-16 bg-[#F9EF08] rounded-full items-center justify-center shadow-lg"
          onPress={handleNext}
        >
          <Ionicons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
