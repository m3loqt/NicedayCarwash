import { getFunctions, httpsCallable } from 'firebase/functions';

export interface CapacityCheckResult {
  ok: boolean;
  reason?: string;
}

// A soft, conservative pre-payment check — not a hard guarantee. Actual wash duration varies by
// vehicle condition (bay assignment stays a manual, real-time admin decision), so this only
// exists to reject obvious overbooking before a customer pays, not to replace that manual step.
//
// Runs server-side (checkCapacity Cloud Function) because it needs to read
// Reservations/ReservationsByBranch, which is admin/supervisor-only under the RTDB rules — a
// customer's client SDK call would get permission-denied reading it directly.
export async function checkBranchCapacity(
  branchId: string,
  datePath: string,
  time: string,
  estimatedMinutes: number
): Promise<CapacityCheckResult> {
  const checkCapacity = httpsCallable<
    { branchId: string; datePath: string; time: string; estimatedMinutes: number },
    CapacityCheckResult
  >(getFunctions(), 'checkCapacity');
  const { data } = await checkCapacity({ branchId, datePath, time, estimatedMinutes });
  return data;
}
