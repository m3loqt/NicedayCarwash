import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import OnboardingScreen from '../components/OnboardingScreen';

export default function OnboardingScreenRoute() {
  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
    // Navigate back to login screen after onboarding completion
    router.replace('/');
  };

  return <OnboardingScreen onComplete={handleOnboardingComplete} />;
}
