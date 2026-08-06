import GoogleAuthButton from '@/components/ui/auth/GoogleAuthButton';
import { useAlert } from '@/hooks/use-alert';
import { getFriendlyAuthErrorMessage } from '@/lib/authErrors';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';

import { get, ref } from 'firebase/database';

import OnboardingScreen from '../components/OnboardingScreen';
import SplashScreen from '../components/SplashScreen';

export default function LoginScreen() {
  const { alert, AlertComponent } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ---------------- ONBOARDING + SPLASH ----------------
  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await AsyncStorage.getItem("hasSeenOnboarding");
      setTimeout(() => {
        setShowSplash(false);
        if (seen !== "true") setShowOnboarding(true);
      }, 2000);
    };
    checkOnboarding();
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  if (showSplash) return <SplashScreen />;
  if (showOnboarding) return <OnboardingScreen onComplete={handleOnboardingComplete} />;

  // ---------------- NORMAL EMAIL LOGIN ----------------
  const handleSignIn = async () => {
    if (isSigningIn) return;

    setEmailError('');
    setPasswordError('');
    let hasError = false;
    if (!email) {
      setEmailError('Please enter your email');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Please enter your password');
      hasError = true;
    }
    if (hasError) return;

    setIsSigningIn(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = result.user.uid;

      const snapshot = await get(ref(db, "users/" + uid));
      if (!snapshot.exists()) {
        alert("Error", "User data not found.");
        setIsSigningIn(false);
        return;
      }

      const userData = snapshot.val();
      const role = userData.role || "default";

      await AsyncStorage.setItem("uid", uid);
      await AsyncStorage.setItem("role", role);

      // Fire-and-forget: keeps a previously-granted push token fresh on this device without
      // ever re-prompting a user who already denied (registerForPushNotificationsAsync only
      // prompts if permission has never been decided).
      registerForPushNotificationsAsync();

      const isStaff = role === "admin" || role === "supervisor" || role === "superadmin";

      // Only brand-new signups have this field at all (see app/register.tsx) - existing
      // accounts predate it and must never be retroactively forced through onboarding.
      if (!isStaff && userData.onboardingCompleted === false) {
        router.replace("/complete-profile");
        return;
      }

      if (isStaff) {
        router.replace("/admin/(tabs)/dashboard");
      } else {
        router.replace("/user/(tabs)/home");
      }

    } catch (e: any) {
      alert("Couldn't sign you in", getFriendlyAuthErrorMessage(e, "We couldn't sign you in. Please try again."));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6"
          showsVerticalScrollIndicator={false}
        >
          {/* Heading */}
          <View className="mb-14 items-center">
            <Text className="text-[30px] font-inter-semibold tracking-tight text-[#1A1A1A] mb-1.5 text-center">
              Welcome back
            </Text>
            <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center">
              Sign in to continue
            </Text>
          </View>

          {/* Fields */}
          <View className="mb-7">
            <Text className="text-[13px] font-inter-medium tracking-tight text-[#374151] mb-1.5">
              Email
            </Text>
            <TextInput
              className={`bg-[#FAFAFA] border rounded-2xl px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A] min-h-[52px] ${
                emailError ? 'border-[#DC2626]' : 'border-[#EEEEEE]'
              }`}
              placeholder="sample@gmail.com"
              placeholderTextColor="#C4C4C4"
              value={email}
              onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {!!emailError && (
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#DC2626] mt-1.5">{emailError}</Text>
            )}
          </View>

          <View className="mb-2">
            <Text className="text-[13px] font-inter-medium tracking-tight text-[#374151] mb-1.5">
              Password
            </Text>
            <View className={`flex-row items-center bg-[#FAFAFA] border rounded-2xl px-4 min-h-[52px] ${
              passwordError ? 'border-[#DC2626]' : 'border-[#EEEEEE]'
            }`}>
              <TextInput
                className="flex-1 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A]"
                placeholder="Enter your password"
                placeholderTextColor="#C4C4C4"
                value={password}
                onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {!!passwordError && (
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#DC2626] mt-1.5">{passwordError}</Text>
            )}
          </View>

          <View className="flex-row justify-end mb-7">
            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text className="text-[13px] font-inter-medium tracking-tight text-[#666] underline">Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            className={`bg-[#F9EF08] rounded-full py-4 items-center mb-5 min-h-[52px] justify-center ${isSigningIn ? 'opacity-60' : ''}`}
            onPress={handleSignIn}
            disabled={isSigningIn}
            activeOpacity={0.85}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color="#1A1A00" />
            ) : (
              <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">Sign In</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-[#F0F0F0]" />
            <Text className="mx-4 text-[12px] font-inter-regular tracking-tight text-[#999]">Or sign in with</Text>
            <View className="flex-1 h-px bg-[#F0F0F0]" />
          </View>

          <View className="mb-8">
            <GoogleAuthButton alert={alert} />
          </View>

          {/* Footer */}
          <View className="items-center pb-8">
            <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center">
              Don't have an account?{' '}
              <Text className="text-[#1A1A1A] font-inter-bold underline" onPress={() => router.push("/register")}>
                Sign Up
              </Text>
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
      {AlertComponent}
    </SafeAreaView>
  );
}
