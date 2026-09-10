import { getFunctions, httpsCallable } from 'firebase/functions';

// Lists branches (other than the one currently holding the booking) that can actually accept it
// as-is - same time slot offered, and bay capacity available. Runs server-side because it needs
// Reservations/ReservationsByBranch and Branches/TimeSlots reads a customer's client SDK can't do
// directly, mirroring checkCapacity's own reasoning.
export async function getSwitchableBranches(appointmentId: string): Promise<string[]> {
  const callable = httpsCallable<{ appointmentId: string }, { branchIds: string[] }>(
    getFunctions(),
    'getSwitchableBranches'
  );
  const { data } = await callable({ appointmentId });
  return data.branchIds;
}

// Moves a still-pending booking to a different branch - same appointment, same payment, only the
// branch assignment changes. The server re-validates everything (ownership, pending status, slot
// availability, capacity) regardless of what was shown in the picker list.
export async function moveBookingToBranch(
  appointmentId: string,
  newBranchId: string
): Promise<{ branchName: string }> {
  const callable = httpsCallable<{ appointmentId: string; newBranchId: string }, { branchName: string }>(
    getFunctions(),
    'moveBookingToBranch'
  );
  const { data } = await callable({ appointmentId, newBranchId });
  return data;
}
