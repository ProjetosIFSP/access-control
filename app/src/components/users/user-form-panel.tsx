import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";

import type { UserSummary } from "@/services/users/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

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

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserFormPanelProps {
  user: UserSummary | null;
  isSubmitting: boolean;
  onSubmit: (values: {
    name: string;
    email: string;
    isAdmin: boolean;
    password?: string;
  }) => void;
  onCancel: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UserFormPanel({
  user,
  isSubmitting,
  onSubmit,
  onCancel,
}: UserFormPanelProps) {
  const isEditing = user !== null;

  const form = useForm({
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      isAdmin: user?.isAdmin ?? false,
      password: "",
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

  // Reset form values when user changes
  useEffect(() => {
    form.reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      isAdmin: user?.isAdmin ?? false,
      password: "",
    });
  }, [user, form]);

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
            <Label htmlFor="user-name">Nome</Label>
            <Input
              id="user-name"
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
            <Label htmlFor="user-email">E-mail</Label>
            <Input
              id="user-email"
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

      {/* Password - only show on create */}
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
              <Label htmlFor="user-password">
                Senha{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Input
                id="user-password"
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

      {/* Is Admin */}
      <form.Field name="isAdmin">
        {(field) => (
          <div className="flex items-center justify-between rounded-lg py-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="user-admin" className="cursor-pointer">
                Administrador
              </Label>
              <span className="text-xs text-muted-foreground">
                Concede acesso total ao sistema
              </span>
            </div>
            <Switch
              id="user-admin"
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked)}
            />
          </div>
        )}
      </form.Field>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
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
