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

  // No deep-link auto-return - the user closes this tab manually (paymentReturn tells them to).
  // iOS blocks here until it closes; Android resolves with `opened` as soon as the tab launches.
  const browserResult = await WebBrowser.openBrowserAsync(data.redirectUrl);

  let sub: { remove: () => void } | null = null;
  if (browserResult.type !== WebBrowser.WebBrowserResultType.OPENED) {
    armGraceTimeout();
  } else {
    // AppState is still 'active' right after the tab launches, so arming now times out a user
    // who is mid-payment in another app (e.g. scanning a QR Ph code) - wait for them to return.
    let wentAway = AppState.currentState !== 'active';
    sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') wentAway = true;
      else if (wentAway) armGraceTimeout();
    });
  }

  try {
    const paid = await promise;
    return paid ? 'paid' : 'unconfirmed';
  } finally {
    sub?.remove();
  }
}
