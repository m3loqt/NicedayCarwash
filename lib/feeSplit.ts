import { BOOKING_FEE } from './bookingFee';

/**
 * Display helper: how a booking's total splits into what was paid online and what is paid at the
 * branch. Read only. Nothing here is saved, charged or used by any booking, payment or refund logic.
 *
 * The online part is always the flat booking fee. The branch part is the stored services and add
 * ons added up, deliberately NOT `amountDue - fee`: a booking's `amountDue` includes the fee when
 * it is created, but the admin "Correct vehicle" tool rewrites it as services and add ons only.
 */

const toNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[₱,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Services and add ons are stored as arrays, but some paths hand them over as keyed objects.
const toList = (value: unknown): Array<{ price?: unknown } | null | undefined> => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value as Record<string, any>);
  return [];
};

export const getBalanceAtBranch = (services?: unknown, addOns?: unknown): number =>
  [...toList(services), ...toList(addOns)].reduce((sum: number, item) => sum + toNumber(item?.price), 0);

const LIVE_OR_FINISHED = new Set(['pending', 'accepted', 'ongoing', 'completed']);

export interface FeeSplit {
  /** The booking fee, paid online through Maya */
  paidOnline: number;
  /** Services and add ons, paid at the branch after the wash */
  atBranch: number;
}

/**
 * The split to show for a booking, or null when it should not be shown: the fee isn't paid yet,
 * the booking was cancelled, or the stored total doesn't equal items plus the fee (for example a
 * booking whose total was corrected without the fee), where a split would contradict the total.
 */
export const getFeeSplit = (booking: {
  isPaid?: boolean;
  status?: string;
  amountDue?: unknown;
  services?: unknown;
  addOns?: unknown;
}): FeeSplit | null => {
  if (booking.isPaid !== true) return null;
  if (!booking.status || !LIVE_OR_FINISHED.has(booking.status)) return null;
  const atBranch = getBalanceAtBranch(booking.services, booking.addOns);
  if (atBranch <= 0) return null;
  if (Math.abs(toNumber(booking.amountDue) - (atBranch + BOOKING_FEE)) > 0.5) return null;
  return { paidOnline: BOOKING_FEE, atBranch };
};
