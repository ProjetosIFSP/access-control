import { ProfileFormPanel } from "@/components/profiles/profile-form-panel";
import { SplitViewPanel } from "@/components/ui/split-view";
import { SplitViewPanelHeader } from "@/components/ui/split-view-panel-header";
import { UserFormPanel } from "@/components/users/user-form-panel";
import type { ProfileSummary } from "@/services/profiles/types";
import type { UserSummary } from "@/services/users/types";

import type { PanelMode } from "./types";

interface UsersSidePanelProps {
  panelMode: PanelMode;
  onClose: () => void;
  isCreatingUser: boolean;
  isUpdatingUser: boolean;
  isCreatingProfile: boolean;
  isUpdatingProfile: boolean;
  onSubmitUser: (values: Parameters<React.ComponentProps<typeof UserFormPanel>["onSubmit"]>[0]) => void;
  onSubmitProfile: (values: Parameters<React.ComponentProps<typeof ProfileFormPanel>["onSubmit"]>[0]) => void;
}

function getPanelTitle(kind: PanelMode["kind"]): string {
  switch (kind) {
    case "createUser":    return "Novo Usuario";
    case "editUser":      return "Editar Usuario";
    case "createProfile": return "Novo Perfil";
    case "editProfile":   return "Editar Perfil";
    default:              return "";
  }
}

function getPanelSubtitle(kind: PanelMode["kind"]): string {
  switch (kind) {
    case "createUser":    return "Preencha os dados para criar um novo usuario.";
    case "editUser":      return "Altere os dados do usuario abaixo.";
    case "createProfile": return "Preencha os dados para criar um novo perfil.";
    case "editProfile":   return "Altere os dados do perfil abaixo.";
    default:              return "";
  }
}

export function UsersSidePanel({
  panelMode,
  onClose,
  isCreatingUser,
  isUpdatingUser,
  isCreatingProfile,
  isUpdatingProfile,
  onSubmitUser,
  onSubmitProfile,
}: UsersSidePanelProps) {
  const editUser: UserSummary | null =
    panelMode.kind === "editUser" ? panelMode.item : null;
  const editProfile: ProfileSummary | null =
    panelMode.kind === "editProfile" ? panelMode.item : null;

  const userFormOpen =
    panelMode.kind === "createUser" || panelMode.kind === "editUser";
  const profileFormOpen =
    panelMode.kind === "createProfile" || panelMode.kind === "editProfile";

  return (
    <SplitViewPanel className="flex flex-col">
      <SplitViewPanelHeader
        title={getPanelTitle(panelMode.kind)}
        subtitle={getPanelSubtitle(panelMode.kind)}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto py-6">
        {userFormOpen && (
          <UserFormPanel
            user={editUser}
            isSubmitting={editUser ? isUpdatingUser : isCreatingUser}
            onSubmit={onSubmitUser}
            onCancel={onClose}
          />
        )}
        {profileFormOpen && (
          <ProfileFormPanel
            profile={editProfile}
            isSubmitting={editProfile ? isUpdatingProfile : isCreatingProfile}
            onSubmit={onSubmitProfile}
            onCancel={onClose}
          />
        )}
      </div>
    </SplitViewPanel>
  );
}
