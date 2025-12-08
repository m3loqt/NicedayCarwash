import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import OnboardingScreen from '../components/OnboardingScreen';

export default function OnboardingScreenRoute() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        if (hasSeenOnboarding === 'true') {
          // User has already seen onboarding, redirect to login
          router.replace('/');
        } else {
          // User hasn't seen onboarding yet, show it
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // On error, show onboarding screen
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
    // Navigate back to login screen after onboarding completion
    router.replace('/');
  };

  // Don't render anything while checking to prevent flash of onboarding screen
  if (isChecking) {
    return null;
  }

  return <OnboardingScreen onComplete={handleOnboardingComplete} />;
}
