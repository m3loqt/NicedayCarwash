// A branch profile object as stored at Branches/{id}/profile. Only the fields the customer app
// actually cares about are typed; the shape is otherwise open.
export interface BranchProfileLike {
  name?: string;
  archivedAt?: unknown;
  archived?: unknown;
  isArchived?: unknown;
  status?: unknown;
  [key: string]: unknown;
}

// Archiving a branch is done from the web dashboard, which stamps `profile.archivedAt`. The
// extra checks are defensive - so an archived branch can never leak into a customer list even
// if an older record used a different flag.
export function isBranchArchived(profile: BranchProfileLike | null | undefined): boolean {
  if (!profile) return false;
  return (
    !!profile.archivedAt ||
    profile.archived === true ||
    profile.isArchived === true ||
    profile.status === 'archived'
  );
}

// A branch is shown to customers only if it has a name and isn't archived.
export function isBranchVisibleToCustomer(profile: BranchProfileLike | null | undefined): boolean {
  return !!profile?.name && !isBranchArchived(profile);
}
