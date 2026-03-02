import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  component: ResetPasswordPage,
});

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Senha deve ter ao menos 8 caracteres")
      .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
      .regex(/[0-9]/, "Deve conter ao menos um número"),
    confirmPassword: z.string().min(1, "Confirmação obrigatória"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

function ResetPasswordPage() {
  const { token, error: urlError } = Route.useSearch();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { newPassword: "", confirmPassword: "" },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.resetPassword({
        newPassword: value.newPassword,
        token,
      });
      if (error) {
        toast.error(
          error.message ?? "Link inválido ou expirado. Solicite um novo.",
        );
        return;
      }
      toast.success("Senha redefinida com sucesso! Faça o login.");
      navigate({
        to: "/",
        search: {
          q: undefined,
          type: undefined,
          state: undefined,
        },
      });
    },
  });

  if (!token || urlError) {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 space-y-3">
            <h1 className="text-xl font-bold text-destructive">
              Link inválido
            </h1>
            <p className="text-sm text-muted-foreground">
              {urlError === "INVALID_TOKEN"
                ? "Este link expirou ou já foi utilizado."
                : "O link de recuperação é inválido."}
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link to="/forgot-password">Solicitar novo link</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <Link
          to="/"
          search={{
            q: undefined,
            type: undefined,
            state: undefined,
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar ao início
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Criar nova senha</h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma senha forte para proteger sua conta.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* New password */}
          <form.Field
            name="newPassword"
            validators={{
              onChange: ({ value }) => {
                const r = passwordSchema.shape.newPassword.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="rp-password">Nova senha</Label>
                <Input
                  id="rp-password"
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
                {/* Password strength hints */}
                {field.state.value && (
                  <ul className="mt-1 space-y-0.5">
                    {[
                      {
                        ok: field.state.value.length >= 8,
                        label: "Mínimo 8 caracteres",
                      },
                      {
                        ok: /[A-Z]/.test(field.state.value),
                        label: "Uma letra maiúscula",
                      },
                      {
                        ok: /[0-9]/.test(field.state.value),
                        label: "Um número",
                      },
                    ].map(({ ok, label }) => (
                      <li
                        key={label}
                        className={`flex items-center gap-1.5 text-xs ${ok ? "text-primary" : "text-muted-foreground"}`}
                      >
                        <CheckCircle2
                          className={`size-3 ${ok ? "text-primary" : "text-muted-foreground/40"}`}
                        />
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form.Field>

          {/* Confirm password */}
          <form.Field
            name="confirmPassword"
            validators={{
              onChangeListenTo: ["newPassword"],
              onChange: ({ value, fieldApi }) => {
                if (!value) return "Confirmação obrigatória";
                if (value !== fieldApi.form.getFieldValue("newPassword"))
                  return "As senhas não coincidem";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="rp-confirm">Confirmar nova senha</Label>
                <Input
                  id="rp-confirm"
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
                className="w-full"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </main>
  );
}
