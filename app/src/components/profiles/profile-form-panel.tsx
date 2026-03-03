import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";

import type { ProfileSummary } from "@/services/profiles/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";

const profileFormSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio").min(2, "Minimo 2 caracteres"),
  description: z.string().optional(),
});

export interface ProfileFormValues {
  name: string;
  description?: string;
}

interface ProfileFormPanelProps {
  profile: ProfileSummary | null;
  isSubmitting: boolean;
  onSubmit: (values: ProfileFormValues) => void;
  onCancel: () => void;
}

export function ProfileFormPanel({
  profile,
  isSubmitting,
  onSubmit,
  onCancel,
}: ProfileFormPanelProps) {
  const isEditing = profile !== null;

  const form = useForm({
    defaultValues: {
      name: profile?.name ?? "",
      description: profile?.description ?? "",
    },
    onSubmit: async ({ value }) => {
      onSubmit({
        name: value.name,
        description: value.description || undefined,
      });
    },
  });

  useEffect(() => {
    form.reset({
      name: profile?.name ?? "",
      description: profile?.description ?? "",
    });
  }, [profile, form]);

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
