import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/icons/google";

const loginSchema = z.object({
  email: z.string().min(1, "E-mail obrigatório").email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
  rememberMe: z.boolean(),
});

const errorMessages: Record<string, string> = {
  "Invalid email or password": "E-mail ou senha inválidos.",
  "Email not verified":
    "E-mail não verificado. Verifique sua caixa de entrada.",
  "Too many requests":
    "Muitas tentativas. Aguarde um momento e tente novamente.",
  "User not found": "Usuário não encontrado.",
  "Account not found": "Conta não encontrada.",
};

function translateError(message?: string | null): string {
  if (!message) return "Credenciais inválidas. Tente novamente.";
  return errorMessages[message] ?? message;
}

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "", rememberMe: false },
    onSubmit: async ({ value }) => {
      setFormError(null);
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
        rememberMe: value.rememberMe,
      });
      if (error) {
        setFormError(translateError(error.message));
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

        {/* Email */}
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              const r = loginSchema.shape.email.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
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
              const r = loginSchema.shape.password.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
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

        {/* Remember me */}
        <form.Field name="rememberMe">
          {(field) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="login-remember"
                checked={field.state.value}
                onCheckedChange={(checked) =>
                  field.handleChange(checked === true)
                }
              />
              <Label
                htmlFor="login-remember"
                className="text-sm font-normal cursor-pointer"
              >
                Manter-me conectado
              </Label>
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              className="w-full bg-zinc-950 text-zinc-50 after:border-none"
              overlayClassname="before:bg-primary"
              variant="hover"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
