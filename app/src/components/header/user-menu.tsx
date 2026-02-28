import gsap from "gsap";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

const WRAPPER_HEIGHT = 48;

/**
 * Expandable user menu with GSAP-powered width + height animation.
 *
 * Layout trick (inspired by OSMO): the outer wrapper keeps a fixed height
 * with `overflow: visible`, so the expanding container overflows without
 * shifting the rest of the page layout.
 */
export function UserMenu() {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const timelineRef = useRef<gsap.core.Timeline | null>(null);
	const chevronRef = useRef<HTMLSpanElement>(null);
	const isAnimatingRef = useRef(false);

	// Hardcoded — will be replaced by real auth state later
	const isLoggedIn = false;

	const toggle = useCallback(() => {
		if (isAnimatingRef.current) return;
		setIsOpen((prev) => !prev);
	}, []);

	// ── Expand / Collapse animation ──────────────────────────────
	useEffect(() => {
		if (!containerRef.current || !contentRef.current) return;

		const container = containerRef.current;
		const content = contentRef.current;
		const chevron = chevronRef.current;
		const menuItems = content.querySelectorAll(".user-menu-item");

		timelineRef.current?.kill();
		isAnimatingRef.current = true;

		if (isOpen) {
			const collapsedWidth = container.offsetWidth;
			const collapsedHeight = container.offsetHeight;

			gsap.set(content, { display: "block", opacity: 0 });
			gsap.set(container, { width: "auto", height: "auto" });

			const expandedWidth = container.scrollWidth;
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

			tl.to(
				content,
				{ opacity: 1, duration: 0.25, ease: "power2.out" },
				"-=0.2",
			);

			if (menuItems.length > 0) {
				tl.fromTo(
					menuItems,
					{ opacity: 0, y: 8 },
					{
						opacity: 1,
						y: 0,
						duration: 0.3,
						stagger: 0.06,
						ease: "power2.out",
					},
					"-=0.15",
				);
			}

			if (chevron) {
				tl.to(
					chevron,
					{ rotation: 180, duration: 0.3, ease: "power2.inOut" },
					0,
				);
			}
		} else {
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

			if (chevron) {
				tl.to(chevron, { rotation: 0, duration: 0.3, ease: "power2.inOut" }, 0);
			}
		}
	}, [isOpen]);

	// ── Click outside to close ───────────────────────────────────
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	// ── Render ────────────────────────────────────────────────────
	return (
		<div
			className="flex justify-end overflow-visible"
			style={{ height: WRAPPER_HEIGHT }}
		>
			<div
				ref={containerRef}
				className="bg-white/70 flex flex-col backdrop-blur-sm hover:bg-white rounded-[1.5rem] overflow-hidden ml-auto"
			>
				{/* Header row: bell + avatar trigger */}
				<div className="flex items-center justify-between gap-1 pl-2">
					<Button variant="ghost" size="icon" className="rounded-full">
						<Bell className="size-4" />
					</Button>

					<button
						type="button"
						className="flex items-center gap-2 hover:bg-muted py-2 px-2 rounded-full cursor-pointer select-none"
						onClick={toggle}
					>
						<Avatar className="size-8">
							{isLoggedIn ? (
								<>
									<AvatarImage
										src="https://github.com/abnerjs.png"
										alt="@abnerjs"
									/>
									<AvatarFallback className="bg-zinc-300 text-zinc-700 font-bold">
										AS
									</AvatarFallback>
								</>
							) : (
								<AvatarFallback className="bg-zinc-300 text-zinc-700 font-bold">
									<User className="size-4" />
								</AvatarFallback>
							)}
						</Avatar>

						<span ref={chevronRef} className="flex">
							<ChevronDown className="size-4" />
						</span>
					</button>
				</div>

				{/* Expandable menu content */}
				<div ref={contentRef} style={{ display: "none" }} className="px-2 pb-2">
					<Separator className="mb-2" />

					{isLoggedIn ? (
						<div className="flex flex-col gap-0.5 min-w-48">
							<button
								type="button"
								className="user-menu-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-700 hover:bg-muted transition-colors w-full text-left"
							>
								<User className="size-4" />
								Meu perfil
							</button>
							<button
								type="button"
								className="user-menu-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-700 hover:bg-muted transition-colors w-full text-left"
							>
								<Settings className="size-4" />
								Preferências
							</button>
							<Separator className="my-1" />
							<button
								type="button"
								className="user-menu-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
							>
								<LogOut className="size-4" />
								Sair
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-2 min-w-48 p-2">
							<p className="user-menu-item text-sm text-muted-foreground text-center">
								Faça login ou registre-se
							</p>
							<Button className="user-menu-item w-full" variant="default">
								Entrar
							</Button>
							<Button className="user-menu-item w-full" variant="outline">
								Registrar
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
