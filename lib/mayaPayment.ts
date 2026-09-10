import { getDatabase, onValue, ref } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as WebBrowser from 'expo-web-browser';
import { AppState } from 'react-native';

export type MayaPaymentResult = 'paid' | 'unconfirmed';

// Once the user is confirmed back in the app, how much longer to wait for the webhook write
// before giving up - Maya's server-to-server confirmation can lag slightly behind the user
// closing the checkout tab.
const CONFIRMATION_GRACE_MS = 20000;

// isPaid is only ever set by mayaWebhook after it re-verifies with Maya server-to-server. The
// listener is attached immediately (before the checkout tab even opens) so a webhook landing
// while the user is still paying - the common case - resolves this right away. Otherwise it
// only resolves false once `armGraceTimeout` has been called (see payBookingFeeWithMaya) and
// that grace period elapses with no write.
function watchPaymentConfirmation(userId: string, dateKey: string, bookingKey: string) {
  const db = getDatabase();
  const isPaidRef = ref(db, `Reservations/ReservationsByUser/${userId}/${dateKey}/${bookingKey}/isPaid`);
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolvePromise!: (paid: boolean) => void;

  const promise = new Promise<boolean>((resolve) => {
    resolvePromise = resolve;
  });

  const finish = (paid: boolean) => {
    if (settled) return;
    settled = true;
    if (timeoutId) clearTimeout(timeoutId);
    unsubscribe();
    resolvePromise(paid);
  };

  const unsubscribe = onValue(isPaidRef, (snapshot) => {
    if (snapshot.val() === true) finish(true);
  });

  return {
    promise,
    armGraceTimeout: () => {
      if (settled || timeoutId) return;
      timeoutId = setTimeout(() => finish(false), CONFIRMATION_GRACE_MS);
    },
  };
}

export async function payBookingFeeWithMaya(
  appointmentId: string,
  dateKey: string,
  userId: string
): Promise<MayaPaymentResult> {
  const createCheckout = httpsCallable<{ appointmentId: string }, { redirectUrl: string }>(
    getFunctions(),
    'createCheckout'
  );
  const { data } = await createCheckout({ appointmentId });

  const { promise, armGraceTimeout } = watchPaymentConfirmation(userId, dateKey, appointmentId);

  // No deep-link auto-return - the user closes/backs out of this tab manually (paymentReturn
  // tells them to). openBrowserAsync only actually blocks until that happens on iOS; on Android
  // it resolves the instant the Custom Tab opens (`{ type: 'opened' }`, per expo-web-browser -
  // NOT when it closes), well before the user has finished paying, so it can't be used to know
  // when the user is actually done. AppState going back to 'active' can, on both platforms - on
  // iOS the app never actually backgrounds for the in-app Safari sheet, so this fires
  // immediately there, matching the previous behavior.
  await WebBrowser.openBrowserAsync(data.redirectUrl);

  let sub: { remove: () => void } | null = null;
  if (AppState.currentState === 'active') {
    armGraceTimeout();
  } else {
    sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') armGraceTimeout();
    });
  }

  try {
    const paid = await promise;
    return paid ? 'paid' : 'unconfirmed';
  } finally {
    sub?.remove();
  }
}
