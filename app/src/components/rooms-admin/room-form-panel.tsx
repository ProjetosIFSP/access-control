import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";

import type {
  RoomSummaryAdmin,
  BlockSummary,
  RoomType,
} from "@/services/rooms/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const roomFormSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").min(2, "Minimo 2 caracteres"),
  blockId: z.string().min(1, "Bloco obrigatorio"),
  typeId: z.string().min(1, "Tipo obrigatorio"),
  requiresBiometry: z.boolean(),
  requiresRFID: z.boolean(),
});

export interface RoomFormValues {
  name: string;
  blockId: string;
  typeId: string;
  requiresBiometry: boolean;
  requiresRFID: boolean;
}

interface RoomFormPanelProps {
  room: RoomSummaryAdmin | null;
  blocks: BlockSummary[];
  roomTypes: RoomType[];
  isSubmitting: boolean;
  onSubmit: (values: RoomFormValues) => void;
  onCancel: () => void;
}

export function RoomFormPanel({
  room,
  blocks,
  roomTypes,
  isSubmitting,
  onSubmit,
  onCancel,
}: RoomFormPanelProps) {
  const isEditing = room !== null;

  const form = useForm({
    defaultValues: {
      name: room?.name ?? "",
      blockId: room?.blockId ?? "",
      typeId: room?.typeId ?? "",
      requiresBiometry: room?.requiresBiometry ?? false,
      requiresRFID: room?.requiresRFID ?? false,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value);
    },
  });

  useEffect(() => {
    form.reset({
      name: room?.name ?? "",
      blockId: room?.blockId ?? "",
      typeId: room?.typeId ?? "",
      requiresBiometry: room?.requiresBiometry ?? false,
      requiresRFID: room?.requiresRFID ?? false,
    });
  }, [room, form]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-5"
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => {
            const r = roomFormSchema.shape.name.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <FormField
            label="Nome"
            htmlFor="room-name"
            error={field.state.meta.errors[0]?.toString()}
          >
            <Input
              id="room-name"
              placeholder="Ex: Laboratorio 101"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="bg-white dark:bg-zinc-900"
            />
          </FormField>
        )}
      </form.Field>

      <form.Field
        name="blockId"
        validators={{
          onChange: ({ value }) => {
            const r = roomFormSchema.shape.blockId.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <FormField
            label="Bloco"
            htmlFor="room-block"
            error={field.state.meta.errors[0]?.toString()}
          >
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
            >
              <SelectTrigger
                id="room-block"
                className="bg-white dark:bg-zinc-900"
                aria-invalid={field.state.meta.errors.length > 0}
              >
                <SelectValue placeholder="Selecione um bloco" />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((block) => (
                  <SelectItem key={block.id} value={block.id}>
                    {block.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      </form.Field>

      <form.Field
        name="typeId"
        validators={{
          onChange: ({ value }) => {
            const r = roomFormSchema.shape.typeId.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <FormField
            label="Tipo de Sala"
            htmlFor="room-type"
            error={field.state.meta.errors[0]?.toString()}
          >
            <Select
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
            >
              <SelectTrigger
                id="room-type"
                className="bg-white dark:bg-zinc-900"
                aria-invalid={field.state.meta.errors.length > 0}
              >
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name} ({rt.abbreviation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      </form.Field>

      <Separator className="bg-zinc-300 dark:bg-zinc-800" />

      <form.Field name="requiresBiometry">
        {(field) => (
          <div className="flex items-center justify-between rounded-lg py-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="room-biometry" className="cursor-pointer">
                Exige Biometria
              </Label>
              <span className="text-xs text-muted-foreground">
                Acesso requer autenticacao biometrica
              </span>
            </div>
            <Switch
              id="room-biometry"
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="requiresRFID">
        {(field) => (
          <div className="flex items-center justify-between rounded-lg py-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="room-rfid" className="cursor-pointer">
                Exige RFID
              </Label>
              <span className="text-xs text-muted-foreground">
                Acesso requer cartao/tag RFID
              </span>
            </div>
            <Switch
              id="room-rfid"
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          </div>
        )}
      </form.Field>

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
