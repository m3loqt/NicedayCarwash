import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'nativewind';
import { useEffect } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import 'react-native-reanimated';
import '../global.css';
import {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getAuth } from 'firebase/auth';

import EnvConfigurationError from '@/components/EnvConfigurationError';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { validateFirebasePublicEnv } from '@/lib/env';
import { ensureAndroidNotificationChannel, handleNotificationResponse } from '@/lib/pushNotifications';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Render text at the sizes the UI was designed for, regardless of the device's font-size /
// display-size setting. Some Android devices (Samsung especially) ship with a larger default
// that pushed fixed-height content - e.g. the supervisor Overview sign-out button - off-screen.
// `maxFontSizeMultiplier` still lets a small OS bump through without breaking layouts.
for (const Component of [RNText, RNTextInput] as unknown as { defaultProps?: Record<string, unknown> }[]) {
  Component.defaultProps = Component.defaultProps || {};
  Component.defaultProps.allowFontScaling = false;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const envCheck = validateFirebasePublicEnv();
  const [loaded] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // App-wide notification wiring: ensure the Android channel exists, and route the user to
  // the right screen when they tap a notification while the app is already running (warm
  // tap). Cold-start taps - the app being launched by a notification - are handled by the
  // session gate in app/index.tsx once the persisted session has been restored; the shared
  // dedupe in handleNotificationResponse keeps the two paths from double-navigating.
  useEffect(() => {
    ensureAndroidNotificationChannel();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void (async () => {
        try {
          // getAuth() (not a firebase/firebase import) so the EnvConfigurationError guard
          // below still wins on a misconfigured build. By the time a tap fires, a route has
          // already mounted and initialized the Firebase app.
          await getAuth().authStateReady();
          const role = await AsyncStorage.getItem('role');
          handleNotificationResponse(response, role);
        } catch {
          // A failed deep-link must never take the app down - the notification list is
          // still reachable from the bell icon.
        }
      })();
    });
    return () => sub.remove();
  }, []);

  if (!loaded) {
    return null;
  }

  if (!envCheck.ok) {
    return <EnvConfigurationError result={envCheck} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
