import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import { GoogleIcon } from "@/components/icons/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

const fieldSchemas = {
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.string().min(1, "E-mail obrigatório").email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter ao menos 8 caracteres")
    .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Deve conter ao menos um número"),
  confirmPassword: z.string().min(1, "Confirmação obrigatória"),
};

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const id = useId();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
        isAdmin: false,
      });
      if (error) {
        setFormError(error.message ?? "Erro ao criar conta. Tente novamente.");
        return;
      }
      onSuccess?.();
    },
  });

  async function handleGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.origin,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Google */}
      <Button
        type="button"
        variant="hoverOutline"
        className="w-full gap-2"
        onClick={handleGoogle}
      >
        <GoogleIcon className="size-4" />
        Continuar com Google
      </Button>

      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">ou</span>
        <Separator className="flex-1" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        {/* Inline error */}
        {formError && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {formError}
          </p>
        )}

        {/* Name */}
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) => {
              const r = fieldSchemas.name.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-name`}>Nome completo</Label>
              <Input
                id={`${id}-name`}
                type="text"
                autoComplete="name"
                placeholder="Seu nome"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
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
              const r = fieldSchemas.email.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-email`}>E-mail</Label>
              <Input
                id={`${id}-email`}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors[0] && (
                <span className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </span>
              )}
            </div>
          )}
        </form.Field>

        {/* Password */}
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              const r = fieldSchemas.password.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-password`}>Senha</Label>
              <Input
                id={`${id}-password`}
                type="password"
                autoComplete="new-password"
                placeholder="Mín. 8 caracteres"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors[0] && (
                <span className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </span>
              )}
            </div>
          )}
        </form.Field>

        {/* Confirm password */}
        <form.Field
          name="confirmPassword"
          validators={{
            onChangeListenTo: ["password"],
            onChange: ({ value, fieldApi }) => {
              if (!value) return "Confirmação obrigatória";
              if (value !== fieldApi.form.getFieldValue("password"))
                return "As senhas não coincidem";
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-confirm`}>Confirmar senha</Label>
              <Input
                id={`${id}-confirm`}
                type="password"
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
              />
              {field.state.meta.errors[0] && (
                <span className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </span>
              )}
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              className="w-full bg-zinc-950 text-white after:border-none"
              overlayClassname="before:bg-primary"
              variant="hover"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Criar conta"
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
