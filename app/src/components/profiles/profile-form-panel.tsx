import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import type { ProfileSummary } from "@/services/profiles/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/form-field";
import { MultiSelect } from "@/components/ui/multi-select";
import type { MultiSelectOption } from "@/components/ui/multi-select";
import { RoomTypeTooltipContent } from "@/components/rooms/permission-tooltip-contents";
import { usersQueryOptions } from "@/services/users";
import {
  roomsAdminQueryOptions,
  roomTypesQueryOptions,
} from "@/services/rooms";
import { profileRelationsQueryOptions } from "@/services/profiles";
import type {
  RoomOption,
  SelectOption,
} from "@/components/users/user-form-panel";

// ── Schema ────────────────────────────────────────────────────────────────────

const profileFormSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").min(2, "Minimo 2 caracteres"),
  description: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProfileFormValues {
  name: string;
  description?: string;
  userIds?: string[];
  roomTypeIds?: string[];
  roomIds?: string[];
}

interface ProfileFormPanelProps {
  profile: ProfileSummary | null;
  isSubmitting: boolean;
  onSubmit: (values: ProfileFormValues) => void;
  onCancel: () => void;
}

// ── Sub-component: RoomSelectors ──────────────────────────────────────────────
//
// Separated so that hooks (computeRoomsCoveredByTypes) are called at the top
// level of a real component — not inside render-prop callbacks.

interface RoomSelectorsProps {
  roomTypeIds: string[];
  roomIds: string[];
  allRoomTypes: SelectOption[];
  allRooms: RoomOption[];
  onChangeRoomTypeIds: (v: string[]) => void;
  onChangeRoomIds: (v: string[]) => void;
}

function RoomSelectors({
  roomTypeIds,
  roomIds,
  allRoomTypes,
  allRooms,
  onChangeRoomTypeIds,
  onChangeRoomIds,
}: RoomSelectorsProps) {
  // Salas cobertas pelos tipos selecionados
  const selectedTypeSet = new Set(roomTypeIds);
  const coveredByTypeIds = new Set<string>();
  for (const room of allRooms) {
    if (selectedTypeSet.has(room.typeId)) coveredByTypeIds.add(room.value);
  }

  // Total pré-selecionadas (apenas por tipo, pois perfil não se aplica aqui)
  const preSelectedCount = coveredByTypeIds.size;

  // Salas disponíveis para seleção direta
  const availableRoomOptions = allRooms.filter(
    (r) => !coveredByTypeIds.has(r.value),
  );

  // Opções de tipo de sala com tooltip listando as salas do tipo
  const roomTypeOptionsWithTooltip: MultiSelectOption[] = allRoomTypes.map(
    (rt) => {
      const roomsOfType = allRooms.filter((r) => r.typeId === rt.value);
      return {
        ...rt,
        tooltip:
          roomsOfType.length > 0 ? (
            <RoomTypeTooltipContent rooms={roomsOfType} />
          ) : undefined,
      };
    },
  );

  return (
    <>
      {/* Tipos de sala */}
      <FormField
        label="Tipos de Sala com Acesso"
        htmlFor="profile-room-types"
        hint="O perfil terá acesso a todas as salas destes tipos."
      >
        <MultiSelect
          options={roomTypeOptionsWithTooltip}
          value={roomTypeIds}
          onChange={onChangeRoomTypeIds}
          placeholder="Selecionar tipos de sala..."
          searchPlaceholder="Buscar tipo..."
          emptyMessage="Nenhum tipo de sala encontrado."
        />
      </FormField>

      {/* Salas com acesso direto */}
      <FormField
        label="Salas com Acesso Direto"
        htmlFor="profile-rooms"
        hint="Salas específicas às quais este perfil terá permissão de acesso."
      >
        <MultiSelect
          options={availableRoomOptions}
          value={roomIds}
          onChange={onChangeRoomIds}
          placeholder="Selecionar salas..."
          searchPlaceholder="Buscar sala ou bloco..."
          emptyMessage={
            coveredByTypeIds.size > 0 && availableRoomOptions.length === 0
              ? "Todas as salas já estão cobertas pelos tipos selecionados."
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

// ── Main component ────────────────────────────────────────────────────────────

export function ProfileFormPanel({
  profile,
  isSubmitting,
  onSubmit,
  onCancel,
}: ProfileFormPanelProps) {
  const isEditing = profile !== null;

  // ── Remote data ────────────────────────────────────────────────────────────

  const { data: usersData } = useQuery(usersQueryOptions({}));
  const { data: roomTypesData } = useQuery(roomTypesQueryOptions);
  const { data: roomsData } = useQuery(roomsAdminQueryOptions);
  const { data: relationsData } = useQuery(
    profileRelationsQueryOptions(profile?.id ?? null),
  );

  const userOptions: SelectOption[] = (usersData?.result ?? []).map((u) => ({
    value: u.id,
    label: u.name,
    sublabel: u.email,
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

  // ── Form ───────────────────────────────────────────────────────────────────

  const form = useForm({
    defaultValues: {
      name: profile?.name ?? "",
      description: profile?.description ?? "",
      userIds: [] as string[],
      roomTypeIds: [] as string[],
      roomIds: [] as string[],
    },
    onSubmit: async ({ value }) => {
      onSubmit({
        name: value.name,
        description: value.description || undefined,
        userIds: value.userIds,
        roomTypeIds: value.roomTypeIds,
        roomIds: value.roomIds,
      });
    },
  });

  // Pre-populate when editing and relations are loaded
  useEffect(() => {
    form.reset({
      name: profile?.name ?? "",
      description: profile?.description ?? "",
      userIds: relationsData?.users.map((u) => u.id) ?? [],
      roomTypeIds: relationsData?.roomTypes.map((rt) => rt.id) ?? [],
      roomIds: relationsData?.rooms.map((r) => r.id) ?? [],
    });
  }, [profile, relationsData, form]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      {/* Nome */}
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => {
            const r = profileFormSchema.shape.name.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <FormField
            label="Nome"
            htmlFor="profile-name"
            error={field.state.meta.errors[0]?.toString()}
          >
            <Input
              id="profile-name"
              placeholder="Ex: Professores, Tecnicos Administrativos"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="bg-white dark:bg-zinc-900"
            />
          </FormField>
        )}
      </form.Field>

      {/* Descricao */}
      <form.Field name="description">
        {(field) => (
          <FormField
            label="Descricao"
            htmlFor="profile-description"
            hint="Opcional. Descreva o proposito deste perfil de acesso."
          >
            <Textarea
              id="profile-description"
              placeholder="Ex: Perfil com acesso a todos os laboratorios do Bloco A"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              rows={3}
              className="bg-white dark:bg-zinc-900 resize-none"
            />
          </FormField>
        )}
      </form.Field>

      <Separator className="bg-zinc-300 dark:bg-zinc-800" />

      {/* Usuarios */}
      <form.Field name="userIds">
        {(field) => (
          <FormField
            label="Usuarios"
            htmlFor="profile-users"
            hint="Selecione os usuarios que pertencerao a este perfil."
          >
            <MultiSelect
              options={userOptions}
              value={field.state.value}
              onChange={(v) => field.handleChange(v)}
              placeholder="Selecionar usuarios..."
              searchPlaceholder="Buscar por nome ou e-mail..."
              emptyMessage="Nenhum usuario encontrado."
            />
          </FormField>
        )}
      </form.Field>

      <Separator className="bg-zinc-300 dark:bg-zinc-800" />

      {/*
       * Tipos de sala e salas precisam se observar mutuamente em tempo real.
       *
       * Estratégia: renderizamos os dois form.Field normalmente (garantindo que
       * o TanStack Form rastreie os valores via handleChange), mas delegamos o
       * JSX visual ao sub-componente RoomSelectors, que recebe os valores
       * atuais e os callbacks handleChange de cada campo.
       *
       * Isso evita o uso de setFieldValue externo, que em algumas versões do
       * TanStack Form v1 não propaga corretamente o valor para o onSubmit.
       */}
      <form.Field name="roomTypeIds">
        {(roomTypeField) => (
          <form.Field name="roomIds">
            {(roomIdsField) => (
              <RoomSelectors
                roomTypeIds={roomTypeField.state.value}
                roomIds={roomIdsField.state.value}
                allRoomTypes={allRoomTypes}
                allRooms={allRooms}
                onChangeRoomTypeIds={(v) => roomTypeField.handleChange(v)}
                onChangeRoomIds={(v) => roomIdsField.handleChange(v)}
              />
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
