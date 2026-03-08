import {
  AlertCircle,
  CheckCircle2,
  Fingerprint,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FingerprintStatus } from "@/lib/biometrics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FingerprintCaptureFeedbackProps {
  status: FingerprintStatus;
  /** Nome legível do dedo selecionado, ex: "Indicador direito" */
  fingerLabel: string;
  /** Mensagem de erro a exibir quando status === "error" */
  errorMessage?: string | null;
  /** Tempo restante em segundos (exibido durante "waiting") */
  countdown?: number;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IdleState({ fingerLabel }: { fingerLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Fingerprint className="size-8 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {fingerLabel}
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Clique em "Capturar" para iniciar a leitura
        </p>
      </div>
    </div>
  );
}

function WaitingState({
  fingerLabel,
  countdown,
  onCancel,
}: {
  fingerLabel: string;
  countdown: number;
  onCancel?: () => void;
}) {
  const progress = countdown > 0 ? (countdown / 30) * 100 : 0;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Countdown ring */}
      <div className="relative flex size-20 items-center justify-center">
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          aria-hidden="true"
          className="-rotate-90 absolute inset-0"
        >
          {/* Track */}
          <circle
            cx="40"
            cy="40"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-zinc-200 dark:text-zinc-700"
          />
          {/* Progress */}
          <circle
            cx="40"
            cy="40"
            r="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="text-amber-500 transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="z-10 flex flex-col items-center">
          <span className="text-lg font-bold tabular-nums text-zinc-800 dark:text-zinc-200 leading-none">
            {countdown}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-none mt-0.5">
            seg
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Aguardando leitura do{" "}
          <span className="font-semibold">{fingerLabel}</span>
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Passe o dedo no leitor biométrico
        </p>
      </div>

      {/* Pulsing dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-amber-500 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>

      {onCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 h-7 px-2 text-xs"
        >
          <X className="size-3 mr-1" />
          Cancelar
        </Button>
      )}
    </div>
  );
}

function ReadingState({ fingerLabel }: { fingerLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative flex size-16 items-center justify-center">
        {/* Pulse rings */}
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-400/30" />
        <span className="absolute inset-2 animate-ping rounded-full bg-blue-400/20 animation-delay-150" />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Fingerprint className="size-8 text-blue-500 dark:text-blue-400 animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Lendo {fingerLabel}...
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          Mantenha o dedo no leitor
        </p>
      </div>
      <Loader2 className="size-4 animate-spin text-blue-500" />
    </div>
  );
}

function SuccessState({ fingerLabel }: { fingerLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        className={cn(
          "flex size-16 items-center justify-center rounded-full",
          "bg-emerald-100 dark:bg-emerald-900/30",
          "ring-4 ring-emerald-200 dark:ring-emerald-800/50",
        )}
      >
        <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          Digital cadastrada!
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {fingerLabel} registrado com sucesso
        </p>
      </div>
    </div>
  );
}

function ErrorState({
  fingerLabel,
  errorMessage,
  onRetry,
  onCancel,
}: {
  fingerLabel: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 ring-4 ring-red-200 dark:ring-red-800/50">
        <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
          Falha na leitura
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[220px]">
          {errorMessage ??
            `Não foi possível ler o ${fingerLabel}. Tente novamente.`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onRetry && (
          <Button size="sm" onClick={onRetry} className="h-7 px-3 text-xs">
            Tentar novamente
          </Button>
        )}
        {onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-7 px-3 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FingerprintCaptureFeedback({
  status,
  fingerLabel,
  errorMessage,
  countdown = 30,
  onRetry,
  onCancel,
  className,
}: FingerprintCaptureFeedbackProps) {
  // Animate mount
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-[140px] items-center justify-center rounded-xl border px-6 py-5 transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        status === "idle" &&
          "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50",
        status === "waiting" &&
          "border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-900/10",
        status === "reading" &&
          "border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-900/10",
        status === "success" &&
          "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10",
        status === "error" &&
          "border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-900/10",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {status === "idle" && <IdleState fingerLabel={fingerLabel} />}
      {status === "waiting" && (
        <WaitingState
          fingerLabel={fingerLabel}
          countdown={countdown}
          onCancel={onCancel}
        />
      )}
      {status === "reading" && <ReadingState fingerLabel={fingerLabel} />}
      {status === "success" && <SuccessState fingerLabel={fingerLabel} />}
      {status === "error" && (
        <ErrorState
          fingerLabel={fingerLabel}
          errorMessage={errorMessage}
          onRetry={onRetry}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}
