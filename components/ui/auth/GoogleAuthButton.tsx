import { getFriendlyAuthErrorMessage } from '@/lib/authErrors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { get, ref, set, update } from 'firebase/database';
import { useEffect } from 'react';
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../../firebase/firebase';

// Must run at module scope (before any component mounts) so the pending auth session claims
// the OAuth redirect before expo-router's own deep-link handler treats it as a navigable route
// and unmounts this screen out from under the pending sign-in promise.
WebBrowser.maybeCompleteAuthSession();

/** Flip to `true` when OAuth clients are configured in the same GCP project as Firebase. */
const GOOGLE_SIGN_IN_ENABLED = false;

type AlertCompat = (titleOrMessage: string, messageOrButtons?: string) => void;

function readGoogleOAuthEnv() {
  const trim = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);
  return {
    iosClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
    webClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  };
}

function isGoogleAuthConfiguredForPlatform(): boolean {
  const { iosClientId, androidClientId, webClientId } = readGoogleOAuthEnv();
  if (Platform.OS === 'android') return Boolean(androidClientId);
  if (Platform.OS === 'ios') return Boolean(iosClientId);
  return Boolean(webClientId);
}

function GoogleSignInDisabledRow() {
  return (
    <View className="relative">
      {/* Non-interactive: Google sign-in isn't live yet */}
      <View className="flex-row items-center justify-center bg-[#F5F5F5] border border-transparent rounded-full py-4 px-4 min-h-[52px] opacity-60">
        <Image
          source={require('../../../assets/images/googlelogo.png')}
          style={{ width: 18, height: 18, marginRight: 10, opacity: 0.45 }}
          resizeMode="contain"
        />
        <Text className="text-[13px] font-inter-medium tracking-tight text-[#9CA3AF]">Continue with Google</Text>
      </View>

      {/* Floating "Coming soon" badge on the right */}
      <View className="absolute -top-2 right-4 bg-[#E5E5E5] rounded-full px-2.5 py-1">
        <Text className="text-[10px] font-inter-bold tracking-tight text-[#6B7280]">Coming soon</Text>
      </View>
    </View>
  );
}

function GoogleSignInConfigured({ alert }: { alert: AlertCompat }) {
  const { iosClientId, androidClientId, webClientId } = readGoogleOAuthEnv();

  // Redirect must use the package-name scheme (Google's Android OAuth client policy requires
  // this - a generic custom scheme like the app's own "nicedaycarwash" gets rejected as
  // insecure since another app could register the same one). The matching intent filter for
  // this scheme is registered via android.intentFilters in app.json.
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
  });

  useEffect(() => {
    if (googleRequest?.url) {
      console.log('[GoogleAuthDebug] request url:', googleRequest.url);
    }
  }, [googleRequest]);

  useEffect(() => {
    if (googleResponse && googleResponse.type !== 'success') {
      console.log('[GoogleAuthDebug] response:', JSON.stringify(googleResponse));
    }
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
        let isNewUser = false;
        if (snapshot.exists()) {
          role = snapshot.val().role || 'default';
          await update(userRef, {
            email: res.user.email,
            firstName: res.user.displayName?.split(' ')[0] || '',
            lastName: res.user.displayName?.split(' ').slice(1).join(' ') || '',
          });
        } else {
          // Matches app/register.tsx's userMap - onboardingCompleted: false is what routes a
          // brand-new account into /complete-profile below, same as email/password signup.
          isNewUser = true;
          await set(userRef, {
            email: res.user.email,
            firstName: res.user.displayName?.split(' ')[0] || '',
            lastName: res.user.displayName?.split(' ').slice(1).join(' ') || '',
            role: 'default',
            profileImage: '',
            onboardingCompleted: false,
          });
        }

        await AsyncStorage.setItem('role', role);
        await AsyncStorage.setItem('uid', uid);

        // Matches routeSignedInUser's isStaff check (app/index.tsx) - Google sign-in is only
        // ever offered on the customer login/signup screens, but a staff account signing in
        // with the same email should still land in the admin app, not the customer home screen.
        const isStaff = role === 'admin' || role === 'supervisor' || role === 'superadmin';
        if (isStaff) {
          router.replace('/admin/(tabs)/bookings');
        } else if (isNewUser) {
          router.replace('/complete-profile');
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
          ? 'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to your .env (and restart Expo).'
          : 'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your .env (and restart Expo).';

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
    <GoogleSignInDisabledRow />
  );
}
