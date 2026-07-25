import { defineSecret } from "firebase-functions/params";

// MAYA_PUBLIC_KEY/MAYA_SECRET_KEY hold the LIVE Business Manager key pair (Maya only issues one
// pair, no separate sandbox toggle) - kept as distinct secrets from the sandbox pair below so
// there is no way to hit pg.maya.ph without deliberately flipping MAYA_ENVIRONMENT=production.
export const mayaLivePublicKey = defineSecret("MAYA_PUBLIC_KEY");
export const mayaLiveSecretKey = defineSecret("MAYA_SECRET_KEY");
export const mayaSandboxPublicKey = defineSecret("MAYA_SANDBOX_PUBLIC_KEY");
export const mayaSandboxSecretKey = defineSecret("MAYA_SANDBOX_SECRET_KEY");

const SANDBOX_BASE = "https://pg-sandbox.paymaya.com";
const PRODUCTION_BASE = "https://pg.maya.ph";

// Set via a Cloud Functions secret/env (MAYA_ENVIRONMENT=production) once ready to go live - defaults to sandbox.
function isProduction(): boolean {
  return process.env.MAYA_ENVIRONMENT === "production";
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

export interface CreateCheckoutParams {
  requestReferenceNumber: string;
  amount: number;
  currency?: string;
  description: string;
  redirectUrl: { success: string; failure: string; cancel: string };
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

export const MAYA_SUCCESS_STATUS = "PAYMENT_SUCCESS";
export const MAYA_TERMINAL_FAILURE_STATUSES = [
  "PAYMENT_FAILED",
  "PAYMENT_EXPIRED",
  "PAYMENT_CANCELLED",
  "AUTH_FAILED",
  "VOIDED",
];
