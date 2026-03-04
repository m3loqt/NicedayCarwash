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
          // Redirecting to login if user has already seen onboarding
          router.replace('/');
        } else {
          // Showing onboarding if user hasn't seen it yet
          setIsChecking(false);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Showing onboarding screen on error
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
    // Navigating back to login screen after onboarding completion
    router.replace('/');
  };

  // Not rendering anything while checking to prevent flash of onboarding screen
  if (isChecking) {
    return null;
  }

  return <OnboardingScreen onComplete={handleOnboardingComplete} />;
}
