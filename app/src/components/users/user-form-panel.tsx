import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId } from "react";
import { z } from "zod";
import {
  ProfileTooltipContent,
  RoomTypeTooltipContent,
} from "@/components/rooms/permission-tooltip-contents";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MultiSelectOption } from "@/components/ui/multi-select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  profileRelationsQueryOptions,
  profilesQueryOptions,
} from "@/services/profiles";
import {
  roomsAdminQueryOptions,
  roomTypesQueryOptions,
} from "@/services/rooms";
import { userRelationsQueryOptions } from "@/services/users";
import type { UserSummary } from "@/services/users/types";

// ── Schemas ───────────────────────────────────────────────────────────────────

const userFormSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").min(2, "Mínimo 2 caracteres"),
  email: z.string().min(1, "E-mail obrigatório").email("E-mail inválido"),
  isAdmin: z.boolean(),
  password: z
    .string()
    .min(6, "Mínimo 6 caracteres")
    .optional()
    .or(z.literal("")),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserFormPanelProps {
  user: UserSummary | null;
  isSubmitting: boolean;
  onSubmit: (values: {
    name: string;
    email: string;
    isAdmin: boolean;
    password?: string;
    profileIds?: string[];
    roomTypeIds?: string[];
    roomIds?: string[];
  }) => void;
  onCancel: () => void;
}

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface RoomOption extends SelectOption {
  typeId: string;
}

// ── Hook: busca relations de múltiplos perfis em paralelo ─────────────────────

function useProfilesCoverage(profileIds: string[]) {
  const ids = profileIds.slice(0, 10);

  const q0 = useQuery(profileRelationsQueryOptions(ids[0] ?? null));
  const q1 = useQuery(profileRelationsQueryOptions(ids[1] ?? null));
  const q2 = useQuery(profileRelationsQueryOptions(ids[2] ?? null));
  const q3 = useQuery(profileRelationsQueryOptions(ids[3] ?? null));
  const q4 = useQuery(profileRelationsQueryOptions(ids[4] ?? null));
  const q5 = useQuery(profileRelationsQueryOptions(ids[5] ?? null));
  const q6 = useQuery(profileRelationsQueryOptions(ids[6] ?? null));
  const q7 = useQuery(profileRelationsQueryOptions(ids[7] ?? null));
  const q8 = useQuery(profileRelationsQueryOptions(ids[8] ?? null));
  const q9 = useQuery(profileRelationsQueryOptions(ids[9] ?? null));

  // roomTypes cobertos pelos perfis: Map profileId → roomType[]
  const profileRoomTypes = new Map<
    string,
    { id: string; name: string; abbreviation: string }[]
  >();
  // rooms diretas dos perfis: Map profileId → room[]
  const profileRoomsDirect = new Map<
    string,
    { id: string; name: string; blockId: string }[]
  >();
  // roomIds cobertos diretamente pelos perfis
  const coveredRoomIdsByProfile = new Set<string>();
  // roomTypeIds cobertos pelos perfis (união)
  const coveredRoomTypeIdsByProfile = new Set<string>();

  for (const [i, q] of [q0, q1, q2, q3, q4, q5, q6, q7, q8, q9].entries()) {
    const id = ids[i];
    if (!id || !q.data) continue;
    profileRoomTypes.set(id, q.data.roomTypes);
    profileRoomsDirect.set(id, q.data.rooms);
    for (const rt of q.data.roomTypes) coveredRoomTypeIdsByProfile.add(rt.id);
    for (const r of q.data.rooms) coveredRoomIdsByProfile.add(r.id);
  }

  return {
    profileRoomTypes,
    profileRoomsDirect,
    coveredRoomIdsByProfile,
    coveredRoomTypeIdsByProfile,
  };
}

// ── PermissionSelectors ───────────────────────────────────────────────────────

interface PermissionSelectorsProps {
  profileIds: string[];
  roomTypeIds: string[];
  roomIds: string[];
  allProfiles: SelectOption[];
  allRoomTypes: SelectOption[];
  allRooms: RoomOption[];
  onChangeProfileIds: (v: string[]) => void;
  onChangeRoomTypeIds: (v: string[]) => void;
  onChangeRoomIds: (v: string[]) => void;
}

function PermissionSelectors({
  profileIds,
  roomTypeIds,
  roomIds,
  allProfiles,
  allRoomTypes,
  allRooms,
  onChangeProfileIds,
  onChangeRoomTypeIds,
  onChangeRoomIds,
}: PermissionSelectorsProps) {
  const {
    profileRoomTypes,
    profileRoomsDirect,
    coveredRoomIdsByProfile,
    coveredRoomTypeIdsByProfile,
  } = useProfilesCoverage(profileIds);

  // Tipos de sala NÃO cobertos por perfis → disponíveis para seleção
  const availableRoomTypeOptions = allRoomTypes.filter(
    (rt) => !coveredRoomTypeIdsByProfile.has(rt.value),
  );

  // Todos os typeIds efetivamente cobertos (por perfil + seleção direta)
  const allCoveredTypeIds = new Set([
    ...coveredRoomTypeIdsByProfile,
    ...roomTypeIds,
  ]);

  // Salas cobertas por tipos (perfil ou seleção direta)
  const coveredRoomIdsByType = new Set<string>();
  for (const room of allRooms) {
    if (allCoveredTypeIds.has(room.typeId))
      coveredRoomIdsByType.add(room.value);
  }

  // Total de salas pré-selecionadas (cobertas por perfil ou tipo)
  const allCoveredRoomIds = new Set([
    ...coveredRoomIdsByProfile,
    ...coveredRoomIdsByType,
  ]);
  const preSelectedCount = allCoveredRoomIds.size;

  // Salas disponíveis para seleção direta (excluindo cobertas)
  const availableRoomOptions = allRooms.filter(
    (r) => !allCoveredRoomIds.has(r.value),
  );

  // Opções de perfil com tooltip mostrando tipos e salas do perfil
  const profileOptionsWithTooltip: MultiSelectOption[] = allProfiles.map(
    (p) => {
      const types = profileRoomTypes.get(p.value) ?? [];
      const rooms = profileRoomsDirect.get(p.value) ?? [];
      const hasData = types.length > 0 || rooms.length > 0;
      return {
        ...p,
        tooltip: hasData ? (
          <ProfileTooltipContent roomTypes={types} rooms={rooms} />
        ) : undefined,
      };
    },
  );

  // Badges inativos de tipos de sala cobertos pelos perfis selecionados,
  // com tooltip listando as salas do tipo
  const seenTypeIds = new Set<string>();
  const roomTypeReadonlyBadges: { label: string; tooltip?: ReactNode }[] = [];
  for (const profileId of profileIds) {
    const types = profileRoomTypes.get(profileId);
    if (types && types.length > 0) {
      for (const t of types) {
        if (!seenTypeIds.has(t.id)) {
          seenTypeIds.add(t.id);
          const roomsOfType = allRooms.filter((r) => r.typeId === t.id);
          roomTypeReadonlyBadges.push({
            label: t.name,
            tooltip:
              roomsOfType.length > 0 ? (
                <RoomTypeTooltipContent rooms={roomsOfType} />
              ) : undefined,
          });
        }
      }
    }
  }

  // Opções de tipos de sala (seleção direta) com tooltip listando salas do tipo
  const roomTypeOptionsWithTooltip: MultiSelectOption[] =
    availableRoomTypeOptions.map((rt) => {
      const roomsOfType = allRooms.filter((r) => r.typeId === rt.value);
      return {
        ...rt,
        tooltip:
          roomsOfType.length > 0 ? (
            <RoomTypeTooltipContent rooms={roomsOfType} />
          ) : undefined,
      };
    });

  return (
    <>
      {/* ── Perfis de Acesso ── */}
      <FormField
        label="Perfis de Acesso"
        htmlFor="user-profiles"
        hint="Associe um ou mais perfis a este usuário."
      >
        <MultiSelect
          options={profileOptionsWithTooltip}
          value={profileIds}
          onChange={onChangeProfileIds}
          placeholder="Selecionar perfis..."
          searchPlaceholder="Buscar perfil..."
          emptyMessage="Nenhum perfil encontrado."
        />
      </FormField>

      {/* ── Tipos de Sala com Acesso ── */}
      <FormField
        label="Tipos de Sala com Acesso"
        htmlFor="user-room-types"
        hint="O usuário terá acesso a todas as salas destes tipos."
      >
        <MultiSelect
          options={roomTypeOptionsWithTooltip}
          value={roomTypeIds}
          onChange={onChangeRoomTypeIds}
          placeholder="Selecionar tipos de sala..."
          searchPlaceholder="Buscar tipo..."
          emptyMessage={
            coveredRoomTypeIdsByProfile.size > 0 &&
            availableRoomTypeOptions.length === 0
              ? "Todos os tipos já estão cobertos pelos perfis selecionados."
              : "Nenhum tipo de sala encontrado."
          }
          readonlyBadges={roomTypeReadonlyBadges}
          disabled={
            roomTypeReadonlyBadges.length > 0 &&
            availableRoomTypeOptions.length === 0
          }
        />
      </FormField>

      {/* ── Salas Específicas com Acesso ── */}
      <FormField
        label="Salas Específicas com Acesso"
        htmlFor="user-rooms"
        hint="Salas individuais às quais o usuário terá acesso direto."
      >
        <MultiSelect
          options={availableRoomOptions}
          value={roomIds}
          onChange={onChangeRoomIds}
          placeholder="Selecionar salas..."
          searchPlaceholder="Buscar sala ou bloco..."
          emptyMessage={
            allCoveredRoomIds.size > 0 && availableRoomOptions.length === 0
              ? "Todas as salas já estão cobertas pelos perfis ou tipos selecionados."
              : "Nenhuma sala encontrada."
          }
          readonlyBadges={
            preSelectedCount > 0
              ? [{ label: `+${preSelectedCount} salas` }]
              : []
          }
        />
      </FormField>
    </>
  );
}

// ── UserFormPanel ─────────────────────────────────────────────────────────────

export function UserFormPanel({
  user,
  isSubmitting,
  onSubmit,
  onCancel,
}: UserFormPanelProps) {
  const id = useId();
  const isEditing = user !== null;

  // ── Remote data ────────────────────────────────────────────────────────────

  const { data: profilesData } = useQuery(profilesQueryOptions);
  const { data: roomTypesData } = useQuery(roomTypesQueryOptions);
  const { data: roomsData } = useQuery(roomsAdminQueryOptions());
  const { data: relationsData } = useQuery(
    userRelationsQueryOptions(user?.id ?? null),
  );

  // ── Form ───────────────────────────────────────────────────────────────────

  const form = useForm({
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      isAdmin: user?.isAdmin ?? false,
      password: "",
      profileIds: [] as string[],
      roomTypeIds: [] as string[],
      roomIds: [] as string[],
    },
    onSubmit: async ({ value }) => {
      const { password, ...rest } = value;
      if (isEditing) {
        onSubmit(rest);
      } else {
        onSubmit({ ...rest, password: password || undefined });
      }
    },
  });

  // Pré-popula ao editar quando as relations chegam
  useEffect(() => {
    form.reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      isAdmin: user?.isAdmin ?? false,
      password: "",
      profileIds: relationsData?.profiles.map((p) => p.id) ?? [],
      roomTypeIds: relationsData?.roomTypes.map((rt) => rt.id) ?? [],
      roomIds: relationsData?.rooms.map((r) => r.id) ?? [],
    });
  }, [user, relationsData, form]);

  // Dados para os seletores
  const allProfiles: SelectOption[] = (profilesData?.result ?? []).map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: p.description || undefined,
  }));

  const allRoomTypes: SelectOption[] = (roomTypesData?.result ?? []).map(
    (rt) => ({
      value: rt.id,
      label: rt.name,
      sublabel: rt.abbreviation,
    }),
  );

  const allRooms: RoomOption[] = (roomsData?.result ?? []).map((r) => ({
    value: r.id,
    label: r.name,
    sublabel: r.blockName,
    typeId: r.typeId,
  }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      {/* Name */}
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => {
            const r = userFormSchema.shape.name.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-name`}>Nome</Label>
            <Input
              id={`${id}-name`}
              placeholder="Nome completo"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="bg-white dark:bg-zinc-900"
            />
            {field.state.meta.errors[0] && (
              <span className="text-xs text-destructive">
                {field.state.meta.errors[0]}
              </span>
            )}
          </div>
        )}
      </form.Field>

      {/* Email */}
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) => {
            const r = userFormSchema.shape.email.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-email`}>E-mail</Label>
            <Input
              id={`${id}-email`}
              type="email"
              placeholder="usuario@email.com"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="bg-white dark:bg-zinc-900"
            />
            {field.state.meta.errors[0] && (
              <span className="text-xs text-destructive">
                {field.state.meta.errors[0]}
              </span>
            )}
          </div>
        )}
      </form.Field>

      {/* Password — apenas na criação */}
      {!isEditing && (
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              if (!value) return undefined;
              if (value.length < 6) return "Mínimo 6 caracteres";
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-password`}>
                Senha{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                id={`${id}-password`}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                className="bg-white dark:bg-zinc-900"
              />
              <span className="text-xs text-muted-foreground">
                Se informada, o usuário poderá fazer login com e-mail e senha.
              </span>
              {field.state.meta.errors[0] && (
                <span className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </span>
              )}
            </div>
          )}
        </form.Field>
      )}

      <Separator className="bg-zinc-300 dark:bg-zinc-800" />

      {/* Administrador */}
      <form.Field name="isAdmin">
        {(field) => (
          <div className="flex items-center justify-between rounded-lg py-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={`${id}-admin`} className="cursor-pointer">
                Administrador
              </Label>
              <span className="text-xs text-muted-foreground">
                Concede acesso total ao sistema
              </span>
            </div>
            <Switch
              id={`${id}-admin`}
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          </div>
        )}
      </form.Field>

      <Separator className="bg-zinc-300 dark:bg-zinc-800" />

      {/*
       * Os três seletores de permissão precisam se observar mutuamente.
       * Usamos form.Field aninhados para garantir que o TanStack Form
       * rastreie os valores via handleChange (setFieldValue externo não
       * propaga corretamente para o onSubmit no TanStack Form v1).
       */}
      <form.Field name="profileIds">
        {(profileField) => (
          <form.Field name="roomTypeIds">
            {(roomTypeField) => (
              <form.Field name="roomIds">
                {(roomIdsField) => (
                  <PermissionSelectors
                    profileIds={profileField.state.value}
                    roomTypeIds={roomTypeField.state.value}
                    roomIds={roomIdsField.state.value}
                    allProfiles={allProfiles}
                    allRoomTypes={allRoomTypes}
                    allRooms={allRooms}
                    onChangeProfileIds={(v) => profileField.handleChange(v)}
                    onChangeRoomTypeIds={(v) => roomTypeField.handleChange(v)}
                    onChangeRoomIds={(v) => roomIdsField.handleChange(v)}
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        )}
      </form.Field>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="hoverOutline"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit]) => (
            <Button
              type="submit"
              variant="hover"
              className="flex-1"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditing ? (
                "Salvar"
              ) : (
                "Criar"
              )}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
