import { FingerprintHandDrawer } from "@/components/users/fingerprint-hand-drawer";
import { UserDeleteDialog } from "@/components/users/user-delete-dialog";
import { ProfileDeleteDialog } from "@/components/profiles/profile-delete-dialog";
import type { ProfileSummary } from "@/services/profiles/types";
import type { UserSummary } from "@/services/users/types";

interface UsersDialogsProps {
  // User delete
  deleteUserTarget: UserSummary | null;
  onDeleteUserOpenChange: (open: boolean) => void;
  isDeletingUser: boolean;
  onConfirmDeleteUser: () => void;
  // Profile delete
  deleteProfileTarget: ProfileSummary | null;
  onDeleteProfileOpenChange: (open: boolean) => void;
  isDeletingProfile: boolean;
  onConfirmDeleteProfile: () => void;
  // Fingerprint drawer
  fingerprintTarget: UserSummary | null;
  onFingerprintOpenChange: (open: boolean) => void;
}

export function UsersDialogs({
  deleteUserTarget,
  onDeleteUserOpenChange,
  isDeletingUser,
  onConfirmDeleteUser,
  deleteProfileTarget,
  onDeleteProfileOpenChange,
  isDeletingProfile,
  onConfirmDeleteProfile,
  fingerprintTarget,
  onFingerprintOpenChange,
}: UsersDialogsProps) {
  return (
    <>
      <FingerprintHandDrawer
        open={fingerprintTarget !== null}
        onOpenChange={onFingerprintOpenChange}
        userId={fingerprintTarget?.id ?? ""}
        userName={fingerprintTarget?.name ?? ""}
      />

      <UserDeleteDialog
        open={deleteUserTarget !== null}
        onOpenChange={onDeleteUserOpenChange}
        userName={deleteUserTarget?.name ?? ""}
        isDeleting={isDeletingUser}
        onConfirm={onConfirmDeleteUser}
      />

      <ProfileDeleteDialog
        open={deleteProfileTarget !== null}
        onOpenChange={onDeleteProfileOpenChange}
        profile={deleteProfileTarget}
        isDeleting={isDeletingProfile}
        onConfirm={onConfirmDeleteProfile}
      />
    </>
  );
}
