import { getFriendlyAuthErrorMessage } from '@/lib/authErrors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { get, ref, set, update } from 'firebase/database';
import { useEffect } from 'react';
import { Image, Platform, Text, TouchableOpacity } from 'react-native';
import { auth, db } from '../../../firebase/firebase';

/** Flip to `true` when OAuth clients are configured in the same GCP project as Firebase. */
const GOOGLE_SIGN_IN_ENABLED = false;

type AlertCompat = (titleOrMessage: string, messageOrButtons?: string) => void;

function readGoogleOAuthEnv() {
  const trim = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);
  return {
    expoClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID),
    iosClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
    webClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  };
}

function isGoogleAuthConfiguredForPlatform(): boolean {
  const { expoClientId, iosClientId, androidClientId, webClientId } = readGoogleOAuthEnv();
  if (Platform.OS === 'android') return Boolean(androidClientId);
  if (Platform.OS === 'ios') return Boolean(iosClientId || expoClientId);
  if (Platform.OS === 'web') return Boolean(webClientId || expoClientId);
  return Boolean(expoClientId);
}

function GoogleSignInDisabledRow({ alert }: { alert: AlertCompat }) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-center bg-[#F5F5F5] border border-transparent rounded-full py-4 px-4 min-h-[52px] opacity-65"
      onPress={() =>
        alert(
          'Google sign-in',
          'Google sign-in is temporarily unavailable. Please use email and password.',
        )
      }
      activeOpacity={0.85}
    >
      <Image
        source={require('../../../assets/images/googlelogo.png')}
        style={{ width: 18, height: 18, marginRight: 10, opacity: 0.55 }}
        resizeMode="contain"
      />
      <Text className="text-[13px] font-inter-medium tracking-tight text-[#9CA3AF]">Continue with Google</Text>
    </TouchableOpacity>
  );
}

function GoogleSignInConfigured({ alert }: { alert: AlertCompat }) {
  const { expoClientId, iosClientId, androidClientId, webClientId } = readGoogleOAuthEnv();

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    expoClientId,
    iosClientId,
    androidClientId,
    webClientId,
  });

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.authentication?.idToken;
    if (!idToken) return;
    const credential = GoogleAuthProvider.credential(idToken);
    signInWithCredential(auth, credential)
      .then(async (res) => {
        const uid = res.user.uid;
        const userRef = ref(db, 'users/' + uid);
        const snapshot = await get(userRef);

        let role = 'default';
        if (snapshot.exists()) {
          role = snapshot.val().role || 'default';
          await update(userRef, {
            email: res.user.email,
            firstName: res.user.displayName?.split(' ')[0] || '',
            lastName: res.user.displayName?.split(' ')[1] || '',
          });
        } else {
          // TODO: when Google sign-in is re-enabled, this new-user path also needs
          // onboardingCompleted: false plus a redirect into /complete-profile, matching
          // app/register.tsx and app/index.tsx's handleSignIn.
          await set(userRef, {
            email: res.user.email,
            firstName: res.user.displayName?.split(' ')[0] || '',
            lastName: res.user.displayName?.split(' ')[1] || '',
            role: 'default',
          });
        }

        await AsyncStorage.setItem('role', role);
        await AsyncStorage.setItem('uid', uid);

        if (role === 'admin') {
          router.replace('/admin/(tabs)/dashboard');
        } else {
          router.replace('/user/(tabs)/home');
        }
      })
      .catch((err: Error) =>
        alert('Couldn\'t sign you in', getFriendlyAuthErrorMessage(err, "We couldn't sign you in with Google. Please try again."))
      );
  }, [googleResponse, alert]);

  return (
    <TouchableOpacity
      className="flex-row items-center justify-center bg-[#FAFAFA] border border-[#EEEEEE] rounded-full py-4 px-4 min-h-[52px]"
      onPress={() => googlePromptAsync()}
      disabled={!googleRequest}
      activeOpacity={0.85}
    >
      <Image
        source={require('../../../assets/images/googlelogo.png')}
        style={{ width: 18, height: 18, marginRight: 10 }}
        resizeMode="contain"
      />
      <Text className="text-[13px] font-inter-medium tracking-tight text-[#1A1A1A]">Continue with Google</Text>
    </TouchableOpacity>
  );
}

function GoogleSignInSection({ alert }: { alert: AlertCompat }) {
  if (!isGoogleAuthConfiguredForPlatform()) {
    const hint =
      Platform.OS === 'android'
        ? 'Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to your .env (and restart Expo).'
        : Platform.OS === 'ios'
          ? 'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID or EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID to your .env (and restart Expo).'
          : 'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID or EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID to your .env (and restart Expo).';

    return (
      <TouchableOpacity
        className="flex-row items-center justify-center bg-[#F5F5F5] border border-transparent rounded-full py-4 px-4 min-h-[52px] opacity-70"
        onPress={() => alert('Google sign-in unavailable', hint)}
        activeOpacity={0.85}
      >
        <Image
          source={require('../../../assets/images/googlelogo.png')}
          style={{ width: 18, height: 18, marginRight: 10, opacity: 0.5 }}
          resizeMode="contain"
        />
        <Text className="text-[13px] font-inter-medium tracking-tight text-[#9CA3AF]">Continue with Google</Text>
      </TouchableOpacity>
    );
  }

  return <GoogleSignInConfigured alert={alert} />;
}

/** Shared Google sign-in button used on both the login and signup screens. */
export default function GoogleAuthButton({ alert }: { alert: AlertCompat }) {
  return GOOGLE_SIGN_IN_ENABLED ? (
    <GoogleSignInSection alert={alert} />
  ) : (
    <GoogleSignInDisabledRow alert={alert} />
  );
}
