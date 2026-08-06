import { logError, logWarn } from '@/lib/logger';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, update } from 'firebase/database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Requests notification permission (if not already decided) and, if granted, registers an
// Expo push token against the signed-in user's record. Safe to call repeatedly - if permission
// was already granted it just refreshes the stored token; if already denied it does NOT
// re-prompt (expo-notifications never re-prompts after a user has explicitly decided).
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    logWarn('pushNotifications.register', 'Push tokens require a physical device (simulator/emulator detected)');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    const uid = getAuth().currentUser?.uid;
    if (uid) {
      await update(ref(getDatabase(), `users/${uid}`), { expoPushToken: token });
    }
    return token;
  } catch (error) {
    logError('pushNotifications.register', error, { context: 'Failed to register for push notifications' });
    return null;
  }
}
