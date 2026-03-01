import gsap from "gsap";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "../ui/animated-theme-toggler";
import useIsMobile from "@/hooks/useIsMobile.hook";
import { authClient } from "@/lib/auth-client";
import { AuthTabs } from "@/components/auth/auth-tabs";

export function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const isLoggedIn = !!session?.user;
  const user = session?.user;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const chevronRef = useRef<HTMLSpanElement>(null);
  const isAnimatingRef = useRef(false);
  const isOpenRef = useRef(false);
  const isMobile = useIsMobile();

  // ── open / close helpers ─────────────────────────────────────
  const open = useCallback(() => {
    if (isAnimatingRef.current || isOpenRef.current) return;
    isOpenRef.current = true;

    const container = containerRef.current;
    const content = contentRef.current;
    const chevron = chevronRef.current;
    if (!container || !content) return;

    const menuItems = content.querySelectorAll(".user-menu-item");
    timelineRef.current?.kill();
    isAnimatingRef.current = true;

    const collapsedWidth = container.offsetWidth;
    const collapsedHeight = container.offsetHeight;

    gsap.set(content, { display: "block", opacity: 0 });
    gsap.set(container, { width: "auto", height: "auto" });

    const expandedWidth = isMobile
      ? (container.parentElement?.offsetWidth ?? container.scrollWidth)
      : container.scrollWidth;
    const expandedHeight = container.scrollHeight;
    gsap.set(container, { width: collapsedWidth, height: collapsedHeight });

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
      },
    });
    timelineRef.current = tl;
    tl.to(container, {
      width: expandedWidth,
      height: expandedHeight,
      duration: 0.5,
      ease: "power3.out",
    });
    tl.to(content, { opacity: 1, duration: 0.25, ease: "power2.out" }, "-=0.2");
    if (menuItems.length > 0) {
      tl.fromTo(
        menuItems,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: "power2.out" },
        "-=0.15",
      );
    }
    if (chevron)
      tl.to(chevron, { rotation: 180, duration: 0.3, ease: "power2.inOut" }, 0);
  }, [isMobile]);

  const close = useCallback(() => {
    if (isAnimatingRef.current || !isOpenRef.current) return;
    isOpenRef.current = false;

    const container = containerRef.current;
    const content = contentRef.current;
    const chevron = chevronRef.current;
    if (!container || !content) return;

    timelineRef.current?.kill();
    isAnimatingRef.current = true;

    const expandedWidth = container.offsetWidth;
    const expandedHeight = container.offsetHeight;
    gsap.set(content, { display: "none" });
    gsap.set(container, { width: "auto", height: "auto" });
    const collapsedWidth = container.offsetWidth;
    const collapsedHeight = container.offsetHeight;
    gsap.set(content, { display: "block" });
    gsap.set(container, { width: expandedWidth, height: expandedHeight });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(content, { display: "none" });
        gsap.set(container, { clearProps: "width,height" });
        isAnimatingRef.current = false;
      },
    });
    timelineRef.current = tl;
    tl.to(content, { opacity: 0, duration: 0.2, ease: "power2.in" });
    tl.to(
      container,
      {
        width: collapsedWidth,
        height: collapsedHeight,
        duration: 0.4,
        ease: "power3.inOut",
      },
      "-=0.1",
    );
    if (chevron)
      tl.to(chevron, { rotation: 0, duration: 0.3, ease: "power2.inOut" }, 0);
  }, []);

  const toggle = useCallback(() => {
    if (isOpenRef.current) close();
    else open();
  }, [open, close]);

  // close when session changes (login/logout)
  useEffect(() => {
    close();
  }, [close]);

  // click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close]);

  async function handleSignOut() {
    await authClient.signOut();
    toast.success("Sessão encerrada.");
    close();
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div
      className={cn(
        "absolute right-0 flex justify-end overflow-visible h-10 md:h-12 z-10",
        isMobile && "left-0",
      )}
    >
      <div
        ref={containerRef}
        className={cn(
          "bg-white/70 flex flex-col backdrop-blur-sm hover:bg-white rounded-[1.5rem] overflow-hidden ml-auto transition-colors",
          "dark:bg-zinc-800/70 dark:hover:bg-zinc-800",
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-end pl-2">
          <AnimatedThemeToggler iconClassName="size-4" />

          {isLoggedIn && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full max-md:size-6"
            >
              <Bell className="size-4" />
            </Button>
          )}

          <button
            type="button"
            className="flex items-center md:gap-2 hover:bg-muted py-2 px-2 rounded-full cursor-pointer select-none"
            onClick={toggle}
            disabled={isPending}
          >
            {isLoggedIn ? (
              <Avatar className="size-6 md:size-8">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name} />
                <AvatarFallback className="bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-400 font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="bg-zinc-300 dark:bg-zinc-600 size-6 md:size-8 flex items-center justify-center rounded-full text-zinc-700 dark:text-zinc-400">
                <User className="size-4" />
              </div>
            )}
            <span ref={chevronRef} className="flex">
              <ChevronDown className="size-4" />
            </span>
          </button>
        </div>

        {/* Expandable content */}
        <div
          ref={contentRef}
          style={{ display: "none" }}
          className="px-3 pb-3 max-md:w-full"
        >
          {isLoggedIn ? (
            <div className="flex flex-col gap-0.5 min-w-52">
              {/* User info */}
              <div className="user-menu-item px-2 py-2 mb-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <Separator className="mb-1 dark:bg-zinc-700" />
              <button
                type="button"
                className="user-menu-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-muted dark:hover:bg-zinc-600 transition-colors w-full text-left"
              >
                <User className="size-4" />
                Meu perfil
              </button>
              <button
                type="button"
                className="user-menu-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-muted dark:hover:bg-zinc-600 transition-colors w-full text-left"
              >
                <Settings className="size-4" />
                Preferências
              </button>
              <Separator className="my-1 dark:bg-zinc-700" />
              <button
                type="button"
                onClick={handleSignOut}
                className="user-menu-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors w-full text-left"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </div>
          ) : (
            <div className="w-72 max-w-[calc(100vw-2rem)]">
              <AuthTabs onSuccess={() => close()} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
