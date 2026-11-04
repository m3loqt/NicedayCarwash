import { defineSecret } from "firebase-functions/params";

// MAYA_PUBLIC_KEY/MAYA_SECRET_KEY hold the LIVE Business Manager key pair (Maya only issues one
// pair, no separate sandbox toggle) - kept as distinct secrets from the sandbox pair below so
// there is no way to hit pg.maya.ph without deliberately flipping MAYA_ENVIRONMENT=production.
export const mayaLivePublicKey = defineSecret("MAYA_PUBLIC_KEY");
export const mayaLiveSecretKey = defineSecret("MAYA_SECRET_KEY");
export const mayaSandboxPublicKey = defineSecret("MAYA_SANDBOX_PUBLIC_KEY");
export const mayaSandboxSecretKey = defineSecret("MAYA_SANDBOX_SECRET_KEY");

// Modeled as a secret even though the value isn't sensitive: both a bare .env.<project> file and
// an explicit defineString() param under the name MAYA_ENVIRONMENT ended up attached to the
// createCheckout Cloud Run service as a plain (non-secret) env var - Cloud Run then rejected a
// later deploy that tried to declare a *secret* of the same name ("Secret environment variable
// overlaps non secret environment variable: MAYA_ENVIRONMENT"). Using a distinct name sidesteps
// that collision instead of trying to purge the stale plain var first.
export const mayaEnvironment = defineSecret("MAYA_ENV_MODE");

const SANDBOX_BASE = "https://pg-sandbox.paymaya.com";
const PRODUCTION_BASE = "https://pg.maya.ph";

function isProduction(): boolean {
  return mayaEnvironment.value() === "production";
}

function baseUrl(): string {
  return isProduction() ? PRODUCTION_BASE : SANDBOX_BASE;
}

export function activePublicKey(): string {
  return isProduction() ? mayaLivePublicKey.value() : mayaSandboxPublicKey.value();
}

export function activeSecretKey(): string {
  return isProduction() ? mayaLiveSecretKey.value() : mayaSandboxSecretKey.value();
}

function basicAuthHeader(key: string): string {
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

// Merchants with Kount fraud screening enabled (e.g. "Checkout with kount") reject any checkout without
// a buyer: Maya answers 400 code 2553 requiring buyer.firstName, buyer.lastName and buyer.contact.
// Merchants without Kount simply ignore it, so it is always sent. Phone is optional.
export interface MayaBuyer {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface CreateCheckoutParams {
  requestReferenceNumber: string;
  amount: number;
  currency?: string;
  description: string;
  redirectUrl: { success: string; failure: string; cancel: string };
  buyer: MayaBuyer;
}

export interface CreateCheckoutResult {
  checkoutId: string;
  redirectUrl: string;
}

export async function createMayaCheckout(
  publicKey: string,
  params: CreateCheckoutParams
): Promise<CreateCheckoutResult> {
  const response = await fetch(`${baseUrl()}/checkout/v1/checkouts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(publicKey),
    },
    body: JSON.stringify({
      totalAmount: {
        value: params.amount,
        currency: params.currency ?? "PHP",
      },
      requestReferenceNumber: params.requestReferenceNumber,
      redirectUrl: params.redirectUrl,
      buyer: {
        firstName: params.buyer.firstName,
        lastName: params.buyer.lastName,
        contact: {
          email: params.buyer.email,
          ...(params.buyer.phone ? { phone: params.buyer.phone } : {}),
        },
      },
      items: [
        {
          name: params.description,
          quantity: 1,
          amount: { value: params.amount },
          totalAmount: { value: params.amount },
        },
      ],
    }),
  });

  const body: any = await response.json().catch(() => null);
  if (!response.ok || !body?.redirectUrl || !body?.checkoutId) {
    throw new Error(`Maya checkout creation failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return { checkoutId: body.checkoutId, redirectUrl: body.redirectUrl };
}

export interface MayaPaymentRecord {
  id?: string;
  status?: string;
  requestReferenceNumber?: string;
  amount?: number;
}

// Authoritative status check - webhooks only carry an IP allowlist for "authenticity" (no HMAC signature
// per Maya's docs), so every webhook re-fetches truth here via the secret key instead of trusting the payload.
export async function fetchPaymentsByReferenceNumber(
  secretKey: string,
  requestReferenceNumber: string
): Promise<MayaPaymentRecord[]> {
  const response = await fetch(
    `${baseUrl()}/payments/v1/payment-rrns/${encodeURIComponent(requestReferenceNumber)}`,
    {
      method: "GET",
      headers: { Authorization: basicAuthHeader(secretKey) },
    }
  );
  if (!response.ok) {
    throw new Error(`Maya payment lookup failed (${response.status})`);
  }
  const body = await response.json().catch(() => []);
  return Array.isArray(body) ? body : [];
}

// Fallback for a secret key scoped to Checkout only: a freshly provisioned app gets K007 "Invalid
// key scope" on every /payments/v1/* call (this lookup, refunds) until Maya's tech team grants the
// Payments scope, but it can still read the checkout itself, whose paymentStatus carries the same
// PAYMENT_SUCCESS/PAYMENT_FAILED/... values. Same trust model as above - a server-side re-fetch with
// the secret key, keyed by the checkoutId stored at creation. The checkout has no payment id (only
// the /payments API exposes it), so mayaPaymentId stays unset on this path.
export async function fetchCheckoutPaymentRecords(
  secretKey: string,
  checkoutId: string
): Promise<MayaPaymentRecord[]> {
  const response = await fetch(`${baseUrl()}/checkout/v1/checkouts/${encodeURIComponent(checkoutId)}`, {
    method: "GET",
    headers: { Authorization: basicAuthHeader(secretKey) },
  });
  if (!response.ok) {
    throw new Error(`Maya checkout lookup failed (${response.status})`);
  }
  const body: any = await response.json().catch(() => null);
  if (!body?.paymentStatus) return [];
  return [{ status: body.paymentStatus, requestReferenceNumber: body.requestReferenceNumber }];
}

export interface RefundResult {
  refundId?: string;
  rawStatus?: string;
}

// Endpoint and key scope are confirmed against the legacy sandbox merchant (a request reached
// the refund validation and was rejected only for the amount field, see below). Refunds still
// need to be enabled on the merchant account by Maya before they succeed in production.
export async function refundMayaPayment(
  secretKey: string,
  paymentId: string,
  amount: number,
  reason: string
): Promise<RefundResult> {
  const response = await fetch(`${baseUrl()}/payments/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuthHeader(secretKey),
    },
    body: JSON.stringify({
      // Maya's refund body names the amount `amount`, unlike Checkout which uses `value`. Found
      // when the first auto-expiry refund came back 400 code 2553: {"field":"totalAmount.amount",
      // "description":"A valid amount is required."} (2026-11-05, booking ND-335067).
      totalAmount: { amount, currency: "PHP" },
      reason,
    }),
  });
  const body: any = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Maya refund failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return { refundId: body?.id, rawStatus: body?.status };
}

export const MAYA_SUCCESS_STATUS = "PAYMENT_SUCCESS";
export const MAYA_TERMINAL_FAILURE_STATUSES = [
  "PAYMENT_FAILED",
  "PAYMENT_EXPIRED",
  "PAYMENT_CANCELLED",
  "AUTH_FAILED",
  "VOIDED",
];
