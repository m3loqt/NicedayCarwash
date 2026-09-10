import GoogleAuthButton from '@/components/ui/auth/GoogleAuthButton';
import { useAlert } from '@/hooks/use-alert';
import { getFriendlyAuthErrorMessage } from '@/lib/authErrors';
import { handleNotificationResponse, registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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

import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';

import { get, ref } from 'firebase/database';

import OnboardingScreen from '../components/OnboardingScreen';
import SplashScreen from '../components/SplashScreen';

type Role = string;

// Resolves a signed-in user's role and forwards them to the right home screen. Shared by the
// startup session-restore gate, the manual email/password sign-in path, and GoogleAuthButton so
// all of them behave identically - same onboarding redirect, same AsyncStorage cache, same
// push-token refresh.
export async function routeSignedInUser(uid: string): Promise<{ routed: boolean; role: Role }> {
  const snapshot = await get(ref(db, 'users/' + uid));
  if (!snapshot.exists()) {
    return { routed: false, role: 'default' };
  }

  const userData = snapshot.val();
  const role: Role = userData.role || 'default';

  await AsyncStorage.setItem('uid', uid);
  await AsyncStorage.setItem('role', role);

  // Fire-and-forget: keeps a previously-granted push token fresh on this device without ever
  // re-prompting a user who already denied (registerForPushNotificationsAsync only prompts if
  // permission has never been decided).
  registerForPushNotificationsAsync();

  const isStaff = role === 'admin' || role === 'supervisor' || role === 'superadmin';

  // Only brand-new signups have onboardingCompleted at all (see app/register.tsx) - existing
  // accounts predate it and must never be retroactively forced through onboarding.
  if (!isStaff && userData.onboardingCompleted === false) {
    router.replace('/complete-profile');
  } else if (isStaff) {
    router.replace('/admin/(tabs)/bookings');
  } else {
    router.replace('/user/(tabs)/home');
  }
  return { routed: true, role };
}

export default function LoginScreen() {
  const { alert, AlertComponent } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  // `restoring` is true while we wait for Firebase Auth to rehydrate the persisted session
  // (and while we redirect a returning user). It only flips to false once we know there is
  // no session and the login form / onboarding should be shown.
  const [restoring, setRestoring] = useState(true);
  const settledRef = useRef(false);

  // ---------------- SESSION RESTORE ----------------
  useEffect(() => {
    // `resolved` flips once we've reached a terminal state - either navigated a returning
    // user away, or revealed the login form. Guards every path (observer, failsafe, catch)
    // so the screen is only ever settled once.
    let resolved = false;

    // Keep the branding splash up for a short minimum so it doesn't flash past when auth
    // resolves instantly (the common case). Only gates the guest path - a returning user is
    // redirected as soon as their role resolves.
    const minSplash = new Promise<void>((resolve) => setTimeout(resolve, 1200));

    const showLogin = async () => {
      if (resolved) return;
      resolved = true;
      const seen = await AsyncStorage.getItem('hasSeenOnboarding').catch(() => null);
      setShowOnboarding(seen !== 'true');
      setRestoring(false);
    };

    // Hard ceiling on the splash. Whatever goes wrong with auth or the RTDB role lookup
    // (dead network, rules, a hung request), the user always lands on the login form -
    // never stuck watching the logo. This is the safety floor the old fixed 2s timer gave.
    const failsafe = setTimeout(() => { void showLogin(); }, 6000);

    // onAuthStateChanged's first callback fires once Firebase has finished reading AsyncStorage,
    // so it reflects the real persisted state. If a user comes back we forward them straight to
    // their home screen instead of making them sign in again on every cold start. settledRef
    // makes this run exactly once - later auth changes (manual sign-in, sign-out) are handled
    // by their own code paths.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (settledRef.current) return;
      settledRef.current = true;

      try {
        if (!user) {
          await minSplash;
          await showLogin();
          return;
        }

        const { routed, role } = await routeSignedInUser(user.uid);
        if (!routed) {
          // Session points at a deleted / never-provisioned account - drop it and show login.
          await auth.signOut().catch(() => {});
          await minSplash;
          await showLogin();
          return;
        }

        // Routed away successfully - keep the splash up until this screen unmounts.
        resolved = true;
        clearTimeout(failsafe);

        // If the app was cold-started by tapping a push, layer the target screen on top of
        // the home screen we just restored to.
        try {
          const launch = Notifications.getLastNotificationResponse();
          if (launch) {
            handleNotificationResponse(launch, role);
            Notifications.clearLastNotificationResponse();
          }
        } catch {
          // getLastNotificationResponse can be unavailable on some runtimes - non-fatal.
        }
      } catch {
        // Network / permission hiccup resolving the role - show the login form rather than
        // trapping the user on the splash screen.
        await minSplash;
        await showLogin();
      } finally {
        clearTimeout(failsafe);
      }
    });

    return () => {
      clearTimeout(failsafe);
      unsubscribe();
    };
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  if (restoring) return <SplashScreen />;
  if (showOnboarding) return <OnboardingScreen onComplete={handleOnboardingComplete} />;

  // ---------------- NORMAL EMAIL LOGIN ----------------
  const handleSignIn = async () => {
    if (isSigningIn) return;

    setEmailError('');
    setPasswordError('');
    setTermsError('');
    let hasError = false;
    if (!email) {
      setEmailError('Please enter your email');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Please enter your password');
      hasError = true;
    }
    if (!agreedToTerms) {
      setTermsError('Please agree to the Terms and Conditions');
      hasError = true;
    }
    if (hasError) return;

    setIsSigningIn(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const { routed } = await routeSignedInUser(result.user.uid);
      if (!routed) {
        alert("Error", "User data not found.");
        setIsSigningIn(false);
      }
      // On success we're navigating away - leave the spinner up until this screen unmounts.
    } catch (e: any) {
      alert("Couldn't sign you in", getFriendlyAuthErrorMessage(e, "We couldn't sign you in. Please try again."));
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FAFAFA]">
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
              className={`bg-white border rounded-2xl px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A] min-h-[52px] ${
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
            <View className={`flex-row items-center bg-white border rounded-2xl px-4 min-h-[52px] ${
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

          <View className="flex-row justify-end mb-5">
            <TouchableOpacity onPress={() => router.push("/forgot-password")}>
              <Text className="text-[13px] font-inter-medium tracking-tight text-[#666] underline">Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Terms checkbox */}
          <View className="mb-7">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => { setAgreedToTerms(!agreedToTerms); if (termsError) setTermsError(''); }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className={`w-5 h-5 rounded-md border-2 items-center justify-center mr-2.5 ${
                  agreedToTerms ? 'bg-[#F9EF08] border-[#F9EF08]' : termsError ? 'border-[#DC2626]' : 'border-[#D4D4D4] bg-white'
                }`}
              >
                {agreedToTerms && <Ionicons name="checkmark" size={14} color="#1A1A00" />}
              </TouchableOpacity>
              <Text className="text-[13px] font-inter-regular tracking-tight text-[#666] flex-1">
                I agree to the{' '}
                <Text className="font-inter-bold text-[#1A1A1A] underline" onPress={() => router.push('/terms')}>
                  Terms and Conditions
                </Text>
              </Text>
            </View>
            {!!termsError && (
              <Text className="text-[12px] font-inter-regular tracking-tight text-[#DC2626] mt-1.5 ml-[30px]">{termsError}</Text>
            )}
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
