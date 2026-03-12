import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Menu, LayoutGrid, Users, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

const EASE: [number, number, number, number] = [0.65, 0.01, 0.05, 0.99];
const EASE_CLOSE: [number, number, number, number] = [0.65, 0.05, 0, 1];

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  search?: Record<string, undefined>;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Início",
    to: "/",
    icon: <BookOpen className="size-4" />,
    search: { q: undefined, type: undefined, state: undefined },
  },
  {
    label: "Usuários e Perfis",
    to: "/users",
    icon: <Users className="size-4" />,
    adminOnly: true,
    search: { q: undefined, profileIds: undefined, tab: undefined },
  },
  {
    label: "Salas e Blocos",
    to: "/rooms",
    icon: <LayoutGrid className="size-4" />,
    adminOnly: true,
    search: {
      tab: undefined,
      q: undefined,
      typeIds: undefined,
      blockIds: undefined,
    },
  },
];

// ── Drawer ────────────────────────────────────────────────────────────────────

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

function MobileNavDrawer({ open, onClose, isAdmin }: MobileNavDrawerProps) {
  if (typeof document === "undefined") return null;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock page scroll synchronously before the first paint
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

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="mobile-nav-overlay"
            className="fixed inset-0 z-50 cursor-pointer bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_CLOSE }}
            onClick={onClose}
            aria-hidden
          />

          {/* Outer positioner — left side */}
          <div
            key="mobile-nav-positioner"
            className="fixed inset-0 z-50 md:inset-y-0 md:right-auto md:w-full md:max-w-xs"
            role="dialog"
            aria-modal
            aria-label="Menu de navegação"
          >
            <motion.div
              className="relative h-full overflow-hidden md:rounded-tr-2xl md:rounded-br-2xl"
              initial={{ x: "-101%" }}
              animate={{ x: 0 }}
              exit={{ x: "-101%" }}
              transition={{ duration: 0.575, ease: EASE_CLOSE }}
            >
              {/* ── Background wipe layers ── */}
              <motion.div
                className="absolute inset-0 bg-primary filter brightness-200 dark:brightness-50"
                initial={{ x: "-101%" }}
                animate={{ x: 0 }}
                exit={{ x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0 }}
              />
              <motion.div
                className="absolute inset-0 bg-primary"
                initial={{ x: "-101%" }}
                animate={{ x: 0 }}
                exit={{ x: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.06 }}
              />
              <motion.div
                className="absolute inset-0 bg-white dark:bg-zinc-900"
                initial={{ x: "-101%" }}
                animate={{ x: 0 }}
                exit={{ x: 0 }}
                transition={{ duration: 0.575, ease: EASE, delay: 0.12 }}
              />

              {/* ── Content ── */}
              <div className="absolute inset-0 z-10 flex flex-col overflow-y-auto overflow-x-hidden">
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
                      Navegação
                    </h2>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500">
                      Acesse as seções do sistema
                    </p>
                  </div>

                  <Button
                    variant="hover"
                    size="icon"
                    className="shrink-0 size-8 rounded-md bg-transparent! text-black hover:text-white dark:text-white"
                    onClick={onClose}
                    aria-label="Fechar menu"
                    overlayClassname="before:bg-primary"
                  >
                    <X className="size-4" />
                  </Button>
                </motion.div>

                {/* Nav links */}
                <motion.nav
                  className="flex flex-col gap-1 px-4 pt-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: 0.37 }}
                >
                  {visibleItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      search={item.search as never}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium",
                        "text-zinc-700 dark:text-zinc-300",
                        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                        "transition-colors",
                        "[&.active]:bg-primary/10 [&.active]:text-primary",
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </motion.nav>

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
                    onClick={onClose}
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
    </AnimatePresence>,
    document.body,
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MobileNav() {
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["users-me"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        credentials: "include",
      });
      if (!res.ok) return { isAdmin: false };
      return res.json() as Promise<{ isAdmin: boolean }>;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const isAdmin = !!data?.isAdmin;

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu de navegação"
        onClick={() => setOpen(true)}
        className={cn(
          "md:hidden flex items-center justify-center",
          "relative z-20",
          "size-10 rounded-full",
          "bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm",
          "text-zinc-700 dark:text-zinc-300",
          "hover:bg-white dark:hover:bg-zinc-800",
          "transition-colors shrink-0",
        )}
      >
        <Menu className="size-5" />
      </button>

      <MobileNavDrawer
        open={open}
        onClose={() => setOpen(false)}
        isAdmin={isAdmin}
      />
    </>
  );
}
