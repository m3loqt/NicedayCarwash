import AuthShell from '@/components/auth/AuthShell';
import CredentialErrorBanner from '@/components/ui/common/CredentialErrorBanner';
import FieldError, { ERROR_COLOR } from '@/components/ui/common/FieldError';
import ErrorSheet from '@/components/ui/ErrorSheet';
import TextLink from '@/components/ui/common/TextLink';
import { getAuthErrorHandling } from '@/lib/authErrors';
import { getEmailError, getSignInPasswordError } from '@/lib/authValidation';
import { handleNotificationResponse, registerForPushNotificationsAsync } from '@/lib/pushNotifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppButton } from '@/components/ui/common/AppButton';
import { AccessibilityInfo, ActivityIndicator, Text, TextInput, View } from 'react-native';

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
  // Optional prefill so Sign Up's "already registered" link can hand off the typed email.
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // True once the user has tapped Sign In at least once - gates "re-validate as you type" so
  // errors don't appear before the user has actually tried to submit.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  // Wrong-credential / rate-limited / disabled-account failures show one shared banner and put
  // BOTH fields in the error state, since a wrong-credential failure should never reveal which
  // field was actually the problem.
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [errorSheet, setErrorSheet] = useState<{ visible: boolean; isNetwork: boolean }>({
    visible: false,
    isNetwork: false,
  });
  const passwordInputRef = useRef<TextInput>(null);

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

  // Clears the shared credential-error state (banner + both fields' error border) - happens the
  // moment the user edits either field, per spec, rather than waiting for the next submit.
  const clearCredentialError = () => {
    if (credentialError) setCredentialError(null);
  };

  const handleEmailChange = (t: string) => {
    setEmail(t);
    if (hasAttemptedSubmit) setEmailError(getEmailError(t) || '');
    clearCredentialError();
  };

  const handlePasswordChange = (t: string) => {
    setPassword(t);
    if (hasAttemptedSubmit) setPasswordError(getSignInPasswordError(t) || '');
    clearCredentialError();
  };

  // ---------------- NORMAL EMAIL LOGIN ----------------
  const handleSignIn = async () => {
    if (isSigningIn) return;

    setHasAttemptedSubmit(true);
    setCredentialError(null);

    const emailErr = getEmailError(email);
    const passwordErr = getSignInPasswordError(password);
    setEmailError(emailErr || '');
    setPasswordError(passwordErr || '');
    if (emailErr || passwordErr) {
      AccessibilityInfo.announceForAccessibility(emailErr || passwordErr || '');
      return;
    }

    setIsSigningIn(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      const { routed } = await routeSignedInUser(result.user.uid);
      if (!routed) {
        setIsSigningIn(false);
        setErrorSheet({ visible: true, isNetwork: false });
      }
      // On success we're navigating away - leave the spinner up until this screen unmounts.
    } catch (e: any) {
      setIsSigningIn(false);
      const handling = getAuthErrorHandling(e, 'signin');
      if (handling.kind === 'field') {
        if (handling.field === 'email') setEmailError(handling.message);
        else setPasswordError(handling.message);
        AccessibilityInfo.announceForAccessibility(handling.message);
      } else if (handling.kind === 'banner') {
        setCredentialError(handling.message);
        setPassword('');
        passwordInputRef.current?.focus();
        AccessibilityInfo.announceForAccessibility(handling.message);
      } else {
        setErrorSheet({ visible: true, isNetwork: handling.isNetwork });
      }
    }
  };

  const emailErrored = !!emailError || !!credentialError;
  const passwordErrored = !!passwordError || !!credentialError;

  return (
    <>
      <AuthShell>
        {/* Heading */}
        <View className="mb-10 items-center">
          <Text className="text-[26px] font-inter-semibold tracking-tight text-[#1A1A1A] mb-1.5 text-center">
            Welcome back!
          </Text>
          <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center">
            Sign in to book your next wash.
          </Text>
        </View>

        {credentialError && <CredentialErrorBanner message={credentialError} />}

        {/* Fields */}
        <View className="mb-8">
          <Text className="text-[13px] font-inter-medium tracking-tight text-[#1A1A1A] mb-1.5">
            Email
          </Text>
          <TextInput
            className={`bg-white border rounded-2xl px-4 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A] min-h-[52px] ${
              emailErrored ? 'border-[1.5px]' : 'border'
            } ${emailErrored ? '' : emailFocused ? 'border-[#9CA3AF]' : 'border-[#E0E0E0]'}`}
            style={emailErrored ? { borderColor: ERROR_COLOR } : undefined}
            placeholder="name@email.com"
            placeholderTextColor="#C4C4C4"
            value={email}
            onChangeText={handleEmailChange}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isSigningIn}
            accessibilityLabel={emailError ? `Email, error: ${emailError}` : 'Email'}
          />
          <FieldError message={emailError} />
        </View>

        <View className="mb-4">
          <Text className="text-[13px] font-inter-medium tracking-tight text-[#1A1A1A] mb-1.5">
            Password
          </Text>
          <View
            className={`flex-row items-center bg-white border rounded-2xl px-4 min-h-[52px] ${
              passwordErrored ? 'border-[1.5px]' : 'border'
            } ${passwordErrored ? '' : passwordFocused ? 'border-[#9CA3AF]' : 'border-[#E0E0E0]'}`}
            style={passwordErrored ? { borderColor: ERROR_COLOR } : undefined}
          >
            <TextInput
              ref={passwordInputRef}
              className="flex-1 py-4 text-[14px] font-inter-regular tracking-tight text-[#1A1A1A]"
              placeholder="Enter your password"
              placeholderTextColor="#C4C4C4"
              value={password}
              onChangeText={handlePasswordChange}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isSigningIn}
              accessibilityLabel={passwordError ? `Password, error: ${passwordError}` : 'Password'}
            />
            <AppButton onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
            </AppButton>
          </View>
          <FieldError message={passwordError} />
        </View>

        <View className="flex-row justify-end mb-6">
          <AppButton onPress={() => router.push("/forgot-password")}>
            <TextLink className="text-[13px]">Forgot password?</TextLink>
          </AppButton>
        </View>

        {/* Sign in button */}
        <AppButton
          className={`bg-[#F9EF08] rounded-full py-4 items-center mb-6 min-h-[52px] justify-center ${isSigningIn ? 'opacity-60' : ''}`}
          onPress={handleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <ActivityIndicator size="small" color="#1A1A00" />
          ) : (
            <Text className="text-[15px] font-inter-bold tracking-tight text-[#1A1A00]">Sign In</Text>
          )}
        </AppButton>

        {/* Google sign-in is intentionally not offered here - re-add <GoogleAuthButton alert={...} />
            (its own useAlert() - this screen no longer keeps one around) with its "Or sign in
            with" divider once Google auth is actually enabled. It's still rendered on Sign Up. */}

        <View className="items-center mb-9">
          <Text className="text-[12px] font-inter-regular tracking-tight text-[#999] text-center">
            By signing in, you agree to our{' '}
            <TextLink className="text-[12px]" onPress={() => router.push('/terms')}>
              Terms and Conditions
            </TextLink>
          </Text>
        </View>

        {/* Footer */}
        <View className="items-center pb-6">
          <Text className="text-[13px] font-inter-regular tracking-tight text-[#999] text-center">
            Don&apos;t have an account?{' '}
            <TextLink className="text-[13px]" onPress={() => router.push("/register")}>
              Sign Up
            </TextLink>
          </Text>
        </View>
      </AuthShell>

      <ErrorSheet
        visible={errorSheet.visible}
        title="Something went wrong"
        message={
          errorSheet.isNetwork
            ? "We couldn't connect. Check your internet connection and try again."
            : "We couldn't sign you in just now. Please try again."
        }
        onPrimaryPress={handleSignIn}
        onClose={() => setErrorSheet({ visible: false, isNetwork: false })}
      />
    </>
  );
}
