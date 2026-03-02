import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message ?? "Erro ao enviar e-mail. Tente novamente.");
        return;
      }
      setSentEmail(value.email);
      setSent(true);
    },
  });

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

        {sent ? (
          /* ── Sent state ── */
          <div className="flex flex-col items-center gap-4 text-center rounded-xl border border-border bg-card p-8 shadow-sm">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Mail className="size-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold">Verifique seu e-mail</h1>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de recuperação para{" "}
                <span className="font-medium text-foreground">{sentEmail}</span>
                . Verifique também a caixa de spam.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSent(false)}
            >
              Tentar outro e-mail
            </Button>
          </div>
        ) : (
          /* ── Form state ── */
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">Esqueceu sua senha?</h1>
              <p className="text-sm text-muted-foreground">
                Informe seu e-mail e enviaremos um link para criar uma nova
                senha.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const r = z
                      .string()
                      .email("E-mail inválido")
                      .safeParse(value);
                    return r.success ? undefined : r.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-1.5">
                    <Label htmlFor="fp-email">E-mail</Label>
                    <Input
                      id="fp-email"
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
                      "Enviar link de recuperação"
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Lembrou a senha?{" "}
              <Link
                to="/"
                search={{
                  q: undefined,
                  type: undefined,
                  state: undefined,
                }}
                className="text-primary hover:underline font-medium"
              >
                Voltar ao login
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
