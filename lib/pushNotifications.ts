import { logError, logPushDiagnostic } from '@/lib/logger';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, update } from 'firebase/database';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Single Android channel for all of the app's notifications. Android needs an explicit
// high-importance channel or push notifications land silently in the shade instead of
// popping as heads-up banners with sound.
export const ANDROID_NOTIFICATION_CHANNEL_ID = 'default';

// Safe to call repeatedly - re-creating an existing channel just updates it. Call this
// early (app start) so the channel exists before the first notification arrives, not only
// after the user logs in.
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
      name: 'Booking updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F9EF08',
      sound: 'default',
    });
  } catch (error) {
    logPushDiagnostic('Failed to create Android notification channel', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// EAS builds don't always expose the project id on expoConfig - fall back to easConfig.
function resolveEasProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

// Requests notification permission (if not already decided) and, if granted, registers an
// Expo push token against the signed-in user's record. Safe to call repeatedly - if permission
// was already granted it just refreshes the stored token; if already denied it does NOT
// re-prompt (expo-notifications never re-prompts after a user has explicitly decided).
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    logPushDiagnostic('Skipped registration - not a physical device (emulator/simulator)');
    return null;
  }

  try {
    await ensureAndroidNotificationChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') {
      logPushDiagnostic('Notification permission not granted - no token registered', { status });
      return null;
    }

    const projectId = resolveEasProjectId();
    if (!projectId) {
      logPushDiagnostic(
        'No EAS projectId found on Constants.expoConfig.extra.eas or Constants.easConfig - cannot fetch an Expo push token'
      );
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    const uid = getAuth().currentUser?.uid;
    if (uid) {
      await update(ref(getDatabase(), `users/${uid}`), { expoPushToken: token });
      logPushDiagnostic('Registered Expo push token', { uid, tokenTail: token.slice(-14) });
    } else {
      logPushDiagnostic('Got an Expo push token but no signed-in user to attach it to');
    }
    return token;
  } catch (error) {
    logPushDiagnostic('Failed to register for push notifications', {
      message: error instanceof Error ? error.message : String(error),
    });
    logError('pushNotifications.register', error, { context: 'Failed to register for push notifications' });
    return null;
  }
}

// Shape of the `data` payload our Cloud Function attaches to each push
// (functions/src/pushNotifications.ts).
export interface NotificationPayloadData {
  appointmentId?: string;
  date?: string;
  type?: string;
}

// Sends the user to the screen a tapped notification points at. Server-sent notifications
// don't all carry `date` (which booking-progress needs), so we fall back to the relevant
// notifications list when a detail screen can't be opened directly.
function routeFromNotificationTap(
  data: NotificationPayloadData | undefined,
  role: string | null
): void {
  const isStaff = role === 'admin' || role === 'supervisor' || role === 'superadmin';

  if (isStaff) {
    router.push('/admin/(tabs)/bookings?tab=pending');
    return;
  }

  if (data?.appointmentId && data?.date) {
    router.push({
      pathname: '/user/booking-progress',
      params: { appointmentId: data.appointmentId, date: data.date },
    });
    return;
  }

  router.push('/user/notifications');
}

// A notification tap can reach us from two places - the warm-tap listener in the root layout
// and the cold-start session gate in app/index.tsx - and on a cold start both can see the
// same response. This set makes handling idempotent: whichever path runs first wins, the
// other is a no-op.
const handledResponseIds = new Set<string>();

export function handleNotificationResponse(
  response: Notifications.NotificationResponse | null | undefined,
  role: string | null
): void {
  if (!response) return;
  const id = response.notification.request.identifier;
  if (id) {
    if (handledResponseIds.has(id)) return;
    handledResponseIds.add(id);
  }
  routeFromNotificationTap(
    response.notification.request.content.data as NotificationPayloadData | undefined,
    role
  );
}
