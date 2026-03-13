import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { roomAccessLogsQueryOptions } from "@/services/rooms";
import type { RoomSummaryItem } from "@/services/rooms/types";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomDrawerProps {
	room: RoomSummaryItem | null;
	blockName: string;
	open: boolean;
	onClose: () => void;
	authenticated: boolean;
	isAdmin: boolean;
}

// ── State config ──────────────────────────────────────────────────────────────

const STATE_CONFIG = {
	aberta: {
		label: "LIVRE",
		textClass: "text-primary",
	},
	fechada: {
		label: "EM USO",
		textClass: "text-zinc-400 dark:text-zinc-500",
	},
	alerta: {
		label: "ALERTA",
		textClass: "text-red-500 dark:text-red-400",
	},
} as const;

// ── Easing ────────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.65, 0.01, 0.05, 0.99];
const EASE_CLOSE: [number, number, number, number] = [0.65, 0.05, 0, 1];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLogTime(timestamp: string): string {
	const parsed = dayjs(timestamp);
	const now = dayjs();

	if (parsed.isSame(now, "day")) {
		return `hoje ${parsed.format("HH:mm")}`;
	}
	if (parsed.isSame(now.subtract(1, "day"), "day")) {
		return `ontem ${parsed.format("HH:mm")}`;
	}
	return `${parsed.fromNow()} ${parsed.format("HH:mm")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RoomDrawer({
	room,
	blockName,
	open,
	onClose,
	isAdmin,
}: RoomDrawerProps) {
	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, onClose]);

	// Lock page scroll synchronously before the first paint.
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

	// Fetch last 3 access logs — only when admin and room is selected
	const { data: logsData, isLoading: logsLoading } = useQuery(
		roomAccessLogsQueryOptions(isAdmin && open ? (room?.id ?? null) : null, 3),
	);

	const config = room ? STATE_CONFIG[room.state] : null;

	// Only show GRANTED entries with a known user
	const occupants = (logsData?.logs ?? []).filter(
		(l) => l.status === "GRANTED" && l.userName,
	);
	const totalLogs =
		logsData?.logs.filter((l) => l.status === "GRANTED" && l.userName).length ??
		0;

	return (
		<AnimatePresence>
			{open && room && config && (
				<>
					{/* Overlay */}
					<motion.div
						key="drawer-overlay"
						className="fixed inset-0 z-50 cursor-pointer bg-black/50"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.35, ease: EASE_CLOSE }}
						onClick={onClose}
						aria-hidden
					/>

					{/* Outer positioner */}
					<div
						key="drawer-positioner"
						className="fixed inset-0 z-50 md:inset-y-0 md:left-auto md:w-full md:max-w-md"
						role="dialog"
						aria-modal
						aria-label={`Detalhes da sala ${room.name}`}
					>
						{/*
						 * motion.div = clip boundary + slide-out element.
						 * Everything inside is clipped by overflow-hidden, so nothing
						 * leaks during open or close animations.
						 */}
						<motion.div
							className="relative h-full overflow-hidden md:rounded-tl-2xl md:rounded-bl-2xl"
							initial={{ x: "101%" }}
							animate={{ x: 0 }}
							exit={{ x: "101%" }}
							transition={{ duration: 0.575, ease: EASE_CLOSE }}
						>
							{/* ── Background wipe layers ── */}
							<motion.div
								className={cn(
									"absolute inset-0",
									room.state === "aberta" &&
										"bg-primary filter brightness-200 dark:brightness-50",
									room.state === "fechada" && "bg-zinc-200 dark:bg-zinc-600",
									room.state === "alerta" && "bg-red-300 dark:bg-red-900",
								)}
								initial={{ x: "101%" }}
								animate={{ x: 0 }}
								exit={{ x: 0 }}
								transition={{ duration: 0.5, ease: EASE, delay: 0 }}
							/>
							<motion.div
								className={cn(
									"absolute inset-0",
									room.state === "aberta" && "bg-primary",
									room.state === "fechada" && "bg-zinc-400",
									room.state === "alerta" && "bg-red-600",
								)}
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
											Informações sobre sala
										</h2>
										<p className="text-sm text-zinc-400 dark:text-zinc-500">
											Verifique os dados da sala
										</p>
									</div>

									<Button
										variant="hover"
										size="icon"
										className="shrink-0 size-8 rounded-md bg-transparent! text-black hover:text-white dark:text-white"
										onClick={onClose}
										aria-label="Fechar"
										overlayClassname={cn(
											room.state === "aberta" && "before:bg-primary",
											room.state === "fechada" && "before:bg-zinc-400",
											room.state === "alerta" && "before:bg-destructive",
										)}
									>
										<X className="size-4" />
									</Button>
								</motion.div>

								{/* Room identity */}
								<motion.div
									className="px-6 pt-4 pb-6 flex flex-col gap-1"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.4, ease: EASE, delay: 0.37 }}
								>
									{/* State label */}
									<span
										className={cn(
											"text-xs font-black tracking-wider uppercase",
											config.textClass,
										)}
									>
										{config.label}
									</span>

									{/* Room name + block name */}
									<div className="flex items-center justify-between gap-2">
										<span className="text-5xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
											{room.name}
										</span>
										<span className="text-xs font-black uppercase text-zinc-400 dark:text-zinc-500 pb-1 shrink-0">
											{blockName}
										</span>
									</div>
								</motion.div>

								{/* Access log — admin only */}
								{isAdmin && (
									<motion.div
										className="flex flex-col gap-3 px-6 pt-6 pb-4 flex-1"
										initial={{ opacity: 0, y: 16 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.4, ease: EASE, delay: 0.42 }}
									>
										<h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
											Últimos ocupantes
										</h3>

										{logsLoading ? (
											<div className="flex flex-col gap-3">
												{(["a", "b", "c"] as const).map((k) => (
													<div
														key={k}
														className="flex items-center justify-between py-2"
													>
														<div className="flex flex-col gap-1.5">
															<div className="h-3.5 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
															<div className="h-2.5 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
														</div>
														<div className="h-3 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
													</div>
												))}
											</div>
										) : occupants.length === 0 ? (
											<p className="text-sm text-zinc-400 dark:text-zinc-500">
												Nenhum acesso registrado.
											</p>
										) : (
											<div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
												{occupants.map((entry) => (
													<div
														key={entry.id}
														className="flex items-center justify-between gap-4 py-3"
													>
														<div className="flex flex-col gap-0.5 min-w-0">
															<span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">
																{entry.userName}
															</span>
															{entry.userEmail && (
																<span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
																	{entry.userEmail}
																</span>
															)}
														</div>
														<span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0 tabular-nums">
															{formatLogTime(entry.timestamp)}
														</span>
													</div>
												))}
											</div>
										)}

										{/* "Ver mais" link */}
										{!logsLoading && totalLogs > 0 && (
											<a
												href="/logs"
												className="text-xs text-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors pt-1"
											>
												mais {totalLogs} ocupantes na última semana...
											</a>
										)}
									</motion.div>
								)}

								{/* Spacer so footer sticks to bottom */}
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
		</AnimatePresence>
	);
}
