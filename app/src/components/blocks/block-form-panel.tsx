import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";

import type { BlockSummary } from "@/services/rooms/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";

const blockFormSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").min(2, "Minimo 2 caracteres"),
});

export interface BlockFormValues {
  name: string;
}

interface BlockFormPanelProps {
  block: BlockSummary | null;
  isSubmitting: boolean;
  onSubmit: (values: BlockFormValues) => void;
  onCancel: () => void;
}

export function BlockFormPanel({
  block,
  isSubmitting,
  onSubmit,
  onCancel,
}: BlockFormPanelProps) {
  const isEditing = block !== null;

  const form = useForm({
    defaultValues: { name: block?.name ?? "" },
    onSubmit: async ({ value }) => {
      onSubmit(value);
    },
  });

  useEffect(() => {
    form.reset({ name: block?.name ?? "" });
  }, [block, form]);

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
            const r = blockFormSchema.shape.name.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {(field) => (
          <FormField
            label="Nome"
            htmlFor="block-name"
            error={field.state.meta.errors[0]?.toString()}
          >
            <Input
              id="block-name"
              placeholder="Ex: Bloco A"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              aria-invalid={field.state.meta.errors.length > 0}
              className="bg-white dark:bg-zinc-900"
            />
          </FormField>
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
