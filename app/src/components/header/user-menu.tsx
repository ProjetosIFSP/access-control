import { useRouter } from "@tanstack/react-router";
import gsap from "gsap";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import useIsMobile from "@/hooks/useIsMobile.hook";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { AnimatedThemeToggler } from "../ui/animated-theme-toggler";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export function UserMenu() {
	const { data: session, isPending } = authClient.useSession();
	const isLoggedIn = !!session?.user;
	const user = session?.user;
	const [activeTab, setActiveTab] = useState<"login" | "register">("login");

	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const loginFormRef = useRef<HTMLDivElement>(null);
	const registerFormRef = useRef<HTMLDivElement>(null);
	const timelineRef = useRef<gsap.core.Timeline | null>(null);
	const chevronRef = useRef<HTMLSpanElement>(null);
	const isAnimatingRef = useRef(false);
	const isOpenRef = useRef(false);
	const isMobile = useIsMobile();
	const router = useRouter();

	// ── Tab switching with GSAP ─────────────────────────────────────
	const switchTab = useCallback(
		(tab: "login" | "register") => {
			if (activeTab === tab) return;

			const currentRef = activeTab === "login" ? loginFormRef : registerFormRef;
			const nextRef = tab === "login" ? loginFormRef : registerFormRef;

			const tl = gsap.timeline();
			tl.to(
				currentRef.current,
				{ opacity: 0, y: 10, duration: 0.2, pointerEvents: "none" },
				0,
			).to(
				nextRef.current,
				{ opacity: 1, y: 0, duration: 0.2, pointerEvents: "auto" },
				0,
			);

			setActiveTab(tab);
		},
		[activeTab],
	);
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

		// Ensure the active form is set to opacity 1 initially BEFORE showing content
		const activeFormRef =
			activeTab === "login" ? loginFormRef : registerFormRef;
		const inactiveFormRef =
			activeTab === "login" ? registerFormRef : loginFormRef;

		gsap.set(activeFormRef.current, { opacity: 1, pointerEvents: "auto" });
		gsap.set(inactiveFormRef.current, { opacity: 0, pointerEvents: "none" });

		gsap.set(content, { display: "block", opacity: 1 });
		gsap.set(container, { width: "auto", height: "auto" });

		// Force a reflow to get accurate measurements
		container.offsetHeight;

		const expandedWidth = isMobile
			? (container.parentElement?.offsetWidth ?? container.scrollWidth)
			: container.scrollWidth;
		const expandedHeight = container.scrollHeight;
		gsap.set(container, {
			width: collapsedWidth,
			height: collapsedHeight,
			transformOrigin: "top center",
		});

		const tl = gsap.timeline({
			onComplete: () => {
				isAnimatingRef.current = false;
				// Keep height as auto after animation, but maintain width if needed
				gsap.set(container, {
					height: "auto",
					width: isMobile ? expandedWidth : "auto",
					transformOrigin: "top center",
				});
			},
		});
		timelineRef.current = tl;

		// Animate container first, then content opacity
		tl.to(
			container,
			{
				width: expandedWidth,
				height: expandedHeight,
				duration: 0.4,
				ease: "power3.out",
			},
			0,
		);

		// Animate menu items if they exist (logged in state)
		if (menuItems.length > 0) {
			tl.fromTo(
				menuItems,
				{ opacity: 0, y: 8 },
				{ opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: "power2.out" },
				0.15,
			);
		}
		if (chevron)
			tl.to(chevron, { rotation: 180, duration: 0.3, ease: "power2.inOut" }, 0);
	}, [isMobile, activeTab]);

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

	// close when user logs in or out (session user changes)
	const prevIsLoggedInRef = useRef(isLoggedIn);
	useEffect(() => {
		if (prevIsLoggedInRef.current !== isLoggedIn) {
			prevIsLoggedInRef.current = isLoggedIn;
			close();
		}
	}, [isLoggedIn, close]);

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
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					close();
					router.navigate({
						to: "/",
						search: { q: undefined, type: undefined, state: undefined },
					});
				},
			},
		});
	}

	const initials = user?.name
		? (() => {
				const parts = user.name.trim().split(/\s+/);
				const first = parts[0]?.[0] ?? "";
				const last =
					parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
				return (first + last).toUpperCase();
			})()
		: "?";

	return (
		<div
			className={cn(
				"absolute right-0 top-4 flex justify-end overflow-visible z-10",
				isMobile && "left-0",
			)}
		>
			<div
				ref={containerRef}
				className={cn(
					"bg-white/70 flex flex-col backdrop-blur-sm rounded-[1.5rem] overflow-hidden ml-auto transition-colors min-h-10 md:min-h-12",
					"dark:bg-zinc-800/70",
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
						<div className="w-full min-w-72">
							{/* Tabs */}
							<div className="flex gap-2 mb-4">
								<button
									type="button"
									onClick={() => switchTab("login")}
									className={cn(
										"flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors",
										activeTab === "login"
											? "bg-zinc-950 text-white"
											: "bg-zinc-300 dark:bg-zinc-700 text-muted-foreground hover:bg-zinc-300/80 dark:hover:bg-zinc-600/80 cursor-pointer",
									)}
								>
									Entrar
								</button>
								<button
									type="button"
									onClick={() => switchTab("register")}
									className={cn(
										"flex-1 py-1 px-2 text-xs font-medium rounded-lg transition-colors",
										activeTab === "register"
											? "bg-zinc-950 text-white"
											: "bg-zinc-300 dark:bg-zinc-700 text-muted-foreground hover:bg-zinc-300/80 dark:hover:bg-zinc-600/80 cursor-pointer",
									)}
								>
									Registrar
								</button>
							</div>

							{/* Forms container - grid for overlapping items */}
							<div className="grid">
								{/* Login Form */}
								<div
									ref={loginFormRef}
									className="col-start-1 row-start-1 transition-opacity"
								>
									<LoginForm onSuccess={() => close()} />
								</div>

								{/* Register Form */}
								<div
									ref={registerFormRef}
									className="col-start-1 row-start-1 transition-opacity"
								>
									<RegisterForm onSuccess={() => close()} />
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
