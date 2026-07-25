import { getDatabase, onValue, ref } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as WebBrowser from 'expo-web-browser';

export type MayaPaymentResult = 'paid' | 'unconfirmed';

// isPaid is only ever set by mayaWebhook after it re-verifies with Maya server-to-server -
// this just watches for that write for a bit so the UI can report a real result instead of
// leaving the user on an unexplained pending state.
function waitForPaymentConfirmation(userId: string, dateKey: string, bookingKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    const db = getDatabase();
    const isPaidRef = ref(db, `Reservations/ReservationsByUser/${userId}/${dateKey}/${bookingKey}/isPaid`);
    let settled = false;
    let unsubscribe: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = (paid: boolean) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
      resolve(paid);
    };

    unsubscribe = onValue(isPaidRef, (snapshot) => {
      if (snapshot.val() === true) finish(true);
    });
    timeoutId = setTimeout(() => finish(false), 20000);
  });
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

  // No deep-link auto-return - the user closes this tab manually (paymentReturn tells them to),
  // and we don't need to distinguish how/why it closed since isPaid is only ever trusted from the
  // webhook-verified DB state below, never from anything the browser or redirect claims.
  await WebBrowser.openBrowserAsync(data.redirectUrl);

  const paid = await waitForPaymentConfirmation(userId, dateKey, appointmentId);
  return paid ? 'paid' : 'unconfirmed';
}
