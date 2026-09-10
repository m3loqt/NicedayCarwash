import { get, getDatabase, ref } from 'firebase/database';

export interface BranchServiceSummary {
  id: string;
  name: string;
}

const sanitizeBranchId = (id: string) => id.replace(/[.#$[\]]/g, '');

/**
 * Names of the services a branch currently offers, for lightweight display (chips/pills).
 *
 * Mirrors ServicesStep.loadServices: branch-local legacy entries stored directly under
 * Branches/{id}/Services, plus shared-catalog entries whose `branches` array includes this
 * branch - each honoring an `isAvailable` override. Returns names only; callers that need
 * prices/duration should use the booking flow's loader instead.
 */
export async function fetchBranchServiceNames(branchId: string): Promise<BranchServiceSummary[]> {
  const db = getDatabase();
  const sid = sanitizeBranchId(branchId);

  const [branchSnap, catalogSnap] = await Promise.all([
    get(ref(db, `Branches/${sid}/Services`)),
    get(ref(db, 'services')),
  ]);

  const branchLocal: Record<string, any> = branchSnap.val() ?? {};
  const catalog: Record<string, any> = catalogSnap.val() ?? {};
  const out: BranchServiceSummary[] = [];
  const seen = new Set<string>();

  for (const [id, val] of Object.entries(branchLocal)) {
    if (val && typeof val === 'object' && val.name && val.isAvailable !== false) {
      out.push({ id, name: String(val.name) });
      seen.add(id);
    }
  }

  for (const [id, master] of Object.entries(catalog)) {
    if (seen.has(id) || !master?.name) continue;
    if (!Array.isArray(master.branches) || !master.branches.includes(sid)) continue;

    const override = branchLocal[id];
    const isAvailable =
      typeof override === 'boolean'
        ? override
        : override?.isAvailable !== undefined
          ? override.isAvailable
          : true;
    if (!isAvailable) continue;

    out.push({ id, name: String(master.name) });
    seen.add(id);
  }

  return out;
}
