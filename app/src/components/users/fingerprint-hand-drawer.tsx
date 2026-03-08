import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { toast } from "sonner";

import { Hand } from "@/assets/vectors/hand";
import { Button } from "@/components/ui/button";

import { useFingerprintReader } from "@/hooks/use-fingerprint-reader";
import {
  FINGER_LABELS,
  FINGERS_LEFT,
  FINGERS_RIGHT,
  type FingerKey,
  countRegisteredInSet,
} from "@/lib/biometrics";
import { cn } from "@/lib/utils";
import {
  fetchUserFingerprints,
  fingerprintQueryKeys,
  registerFingerprint,
} from "@/services/users/fingerprints";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FingerprintHandDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

type ActiveHandTab = "left" | "right";

// ── Constants ─────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.65, 0.01, 0.05, 0.99];
const EASE_CLOSE: [number, number, number, number] = [0.65, 0.05, 0, 1];
// ── Main Drawer ───────────────────────────────────────────────────────────────

export function FingerprintHandDrawer({
  open,
  onOpenChange,
  userId,
  userName,
}: FingerprintHandDrawerProps) {
  const queryClient = useQueryClient();

  // ── Local state ─────────────────────────────────────────────────────────────
  // Tabs: left first, right second (per spec)
  const [activeTab, setActiveTab] = useState<ActiveHandTab>("left");
  const [selectedFinger, setSelectedFinger] = useState<FingerKey | null>(null);

  // ── Reader hook ─────────────────────────────────────────────────────────────
  const reader = useFingerprintReader({ mode: "keyboard" });

  // ── Fetch fingerprints ──────────────────────────────────────────────────────
  const { data: fingerprints = [], isLoading: isLoadingFingerprints } =
    useQuery({
      queryKey: fingerprintQueryKeys.list(userId),
      queryFn: () => fetchUserFingerprints(userId),
      enabled: open && !!userId,
      staleTime: 1000 * 60 * 2,
    });

  // ── Register mutation ───────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: registerFingerprint,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: fingerprintQueryKeys.list(userId),
      });
      toast.success("Digital cadastrada com sucesso!");
      setSelectedFinger(null);
      reader.reset();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao cadastrar a digital",
      );
    },
  });

  // ── Reset selectedFinger on error — ícone volta ao estado inicial ────────────
  useEffect(() => {
    if (reader.status === "error") {
      setSelectedFinger(null);
      reader.reset();
    }
  }, [reader.status, reader.reset]);

  // ── Auto-register when template is captured ──────────────────────────────────
  const registerMutate = registerMutation.mutate;
  const registerIsPending = registerMutation.isPending;

  useEffect(() => {
    if (
      reader.status === "success" &&
      reader.lastTemplate &&
      selectedFinger &&
      !registerIsPending
    ) {
      registerMutate({
        userId,
        finger: selectedFinger,
        template: reader.lastTemplate,
      });
    }
  }, [
    reader.status,
    reader.lastTemplate,
    selectedFinger,
    userId,
    registerMutate,
    registerIsPending,
  ]);

  // ── Keyboard close ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // ── Lock page scroll ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (open) {
      document.documentElement.classList.add("drawer-open");
    } else {
      document.documentElement.classList.remove("drawer-open");
    }
    return () => {
      document.documentElement.classList.remove("drawer-open");
    };
  }, [open]);

  // ── Reset on close ───────────────────────────────────────────────────────────
  const readerReset = reader.reset;
  useEffect(() => {
    if (!open) {
      setSelectedFinger(null);
      readerReset();
      setActiveTab("left");
    }
  }, [open, readerReset]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleFingerClick = useCallback(
    (finger: FingerKey) => {
      const alreadyRegistered = fingerprints.some(
        (f) => f.finger === finger && f.isActive,
      );
      if (alreadyRegistered) {
        toast.info(`${FINGER_LABELS[finger]} já está cadastrado.`);
        return;
      }

      // Toggle: clicar no mesmo dedo em modo leitura cancela a leitura
      if (
        selectedFinger === finger &&
        (reader.status === "waiting" || reader.status === "reading")
      ) {
        reader.cancelCapture();
        setSelectedFinger(null);
        return;
      }

      if (reader.status === "waiting" || reader.status === "reading") {
        reader.cancelCapture();
      }

      setSelectedFinger(finger);
      reader.startCapture();
    },
    [fingerprints, reader, selectedFinger],
  );

  const handleTabChange = useCallback(
    (tab: ActiveHandTab) => {
      if (tab === activeTab) return;
      if (reader.status === "waiting" || reader.status === "reading") {
        reader.cancelCapture();
      }
      setSelectedFinger(null);
      reader.reset();
      setActiveTab(tab);
    },
    [activeTab, reader],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // ── Tab counts ────────────────────────────────────────────────────────────────
  const leftCount = countRegisteredInSet(FINGERS_LEFT, fingerprints);
  const rightCount = countRegisteredInSet(FINGERS_RIGHT, fingerprints);

  // ── Tabs config — left first ──────────────────────────────────────────────────
  const TABS = [
    { key: "left" as const, label: "Mão Esquerda", count: leftCount },
    { key: "right" as const, label: "Mão Direita", count: rightCount },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="fp-drawer-overlay"
            className="fixed inset-0 z-50 cursor-pointer bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_CLOSE }}
            onClick={handleClose}
            aria-hidden
          />

          {/* Outer positioner */}
          <div
            key="fp-drawer-positioner"
            className="fixed inset-0 z-50 md:inset-y-0 md:left-auto md:w-full md:max-w-md"
            role="dialog"
            aria-modal
            aria-label={`Cadastro de digitais — ${userName}`}
          >
            {/*
             * Clip boundary + slide element.
             * Rounded on the left only, same as room-drawer.
             */}
            <motion.div
              className="relative h-full overflow-hidden md:rounded-tl-2xl md:rounded-bl-2xl"
              initial={{ x: "101%" }}
              animate={{ x: 0 }}
              exit={{ x: "101%" }}
              transition={{ duration: 0.575, ease: EASE_CLOSE }}
            >
              {/* ── Background wipe layers (primary palette) ── */}
              <motion.div
                className="absolute inset-0 bg-primary filter brightness-200 dark:brightness-50"
                initial={{ x: "101%" }}
                animate={{ x: 0 }}
                exit={{ x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0 }}
              />
              <motion.div
                className="absolute inset-0 bg-primary"
                initial={{ x: "101%" }}
                animate={{ x: 0 }}
                exit={{ x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.06 }}
              />
              <motion.div
                className="absolute inset-0 bg-white dark:bg-zinc-900"
                initial={{ x: "101%" }}
                animate={{ x: 0 }}
                exit={{ x: 0 }}
                transition={{ duration: 0.575, ease: EASE, delay: 0.12 }}
              />

              {/* ── Content ── */}
              <div className="absolute inset-0 z-10 flex flex-col overflow-hidden">
                {/* Header */}
                <motion.div
                  className="flex items-start justify-between gap-4 px-6 pt-8 pb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.32 }}
                >
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-50">
                      Credenciais
                    </h2>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">
                      Gerencie suas credenciais de acesso
                    </p>
                  </div>

                  <Button
                    variant="hover"
                    size="icon"
                    className="shrink-0 size-8 rounded-md bg-transparent! text-black hover:text-white dark:text-white"
                    onClick={handleClose}
                    aria-label="Fechar"
                    overlayClassname="before:bg-primary"
                  >
                    <X className="size-4" />
                  </Button>
                </motion.div>

                {/* User identity */}
                <motion.div
                  className="px-6 pt-4 pb-6 flex flex-col gap-1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.37 }}
                >
                  <span className="text-xs font-black tracking-wider uppercase text-primary">
                    BIOMETRIA
                  </span>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-4xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 leading-none truncate">
                      {userName}
                    </span>
                    <span className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 pb-1 shrink-0">
                      {leftCount + rightCount}/10 digitais
                    </span>
                  </div>
                </motion.div>

                {/* Body */}
                <motion.div
                  className="flex flex-col gap-4 px-6 flex-1"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.42 }}
                >
                  {/* Tabs — left first */}
                  <div className="flex border-b border-zinc-200 dark:border-zinc-700">
                    {TABS.map(({ key, label, count }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleTabChange(key)}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                          activeTab === key
                            ? "border-primary text-primary"
                            : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                        )}
                      >
                        {label}
                        {count > 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold",
                              activeTab === key
                                ? "bg-primary text-primary-foreground"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Hand SVG — botões posicionados nas pontas dos dedos */}
                  <div className="flex justify-center">
                    {isLoadingFingerprints ? (
                      <div className="flex size-56 items-center justify-center">
                        <Loader2 className="size-6 animate-spin text-zinc-300 dark:text-zinc-600" />
                      </div>
                    ) : (
                      <div className="relative size-56 text-zinc-300 dark:text-zinc-700">
                        <Hand
                          side={activeTab}
                          registeredFingers={fingerprints}
                          selectedFinger={selectedFinger}
                          onFingerClick={handleFingerClick}
                          readerStatus={reader.status}
                          captureActive={
                            reader.status === "waiting" ||
                            reader.status === "reading"
                          }
                          countdown={reader.countdown}
                          interactive
                        />
                      </div>
                    )}
                  </div>

                  {selectedFinger ? (
                    <Button
                      variant="hoverOutline"
                      className="w-full text-black! dark:text-white! after:border-zinc-200! dark:after:border-zinc-800!"
                      overlayClassname="before:bg-zinc-200 dark:before:bg-zinc-800"
                      onClick={() => {
                        reader.cancelCapture();
                        setSelectedFinger(null);
                      }}
                    >
                      Cancelar leitura
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 pb-2">
                      Toque em um dedo para iniciar o cadastro
                    </p>
                  )}
                </motion.div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Footer */}
                <motion.div
                  className="px-6 py-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE, delay: 0.46 }}
                >
                  <Button
                    onClick={handleClose}
                    variant="hoverOutline"
                    className="w-full text-black! dark:text-white! after:border-zinc-200! dark:after:border-zinc-800!"
                    overlayClassname="before:bg-zinc-200 dark:before:bg-zinc-800"
                  >
                    Fechar
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
