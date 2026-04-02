import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import { Icon } from "@iconify/react";
import {
	CircleUser,
	CircleUserIcon,
	CircleUserRound,
	CircleUserRoundIcon,
	User,
	User2,
	UserRound,
} from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

// ── Types ─────────────────────────────────────────────────────────────────────

type UserInfo = { id: string; name: string; email: string };
type RoomState = "aberta" | "fechada" | "alerta";

export type RoomCardItem = {
	id: string;
	name: string;
	typeAbbreviation: string;
	state: RoomState;
	lastStatusUpdateAt: string | null;
	currentUser?: UserInfo | null;
	lastUser?: UserInfo | null;
};

interface RoomCardProps {
	room: RoomCardItem;
	authenticated: boolean;
	onClick?: () => void;
}

// ── State config ──────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<
	RoomState,
	{ indicatorClass: string; label: string }
> = {
	aberta: {
		indicatorClass: "bg-zinc-400 dark:bg-zinc-500",
		label: "Em uso",
	},
	alerta: {
		indicatorClass: "bg-red-700 dark:bg-red-600",
		label: "Alerta",
	},
	fechada: {
		indicatorClass: "bg-primary",
		label: "Livre",
	},
};

// ── Component ─────────────────────────────────────────────────────────────────

export function RoomCard({ room, authenticated, onClick }: RoomCardProps) {
	const { indicatorClass } = STATE_CONFIG[room.state];

	const displayUser = room.state === "aberta" ? room.currentUser : null;

	const { formattedTime, fullDateTime } = useMemo(() => {
		if (!room.lastStatusUpdateAt)
			return { formattedTime: null, fullDateTime: null };
		const parsed = dayjs(room.lastStatusUpdateAt);
		return {
			formattedTime: parsed.isBefore(dayjs().startOf("day"))
				? parsed.fromNow()
				: parsed.format("HH:mm"),
			fullDateTime: parsed.format("DD/MM/YYYY HH:mm"),
		};
	}, [room.lastStatusUpdateAt]);

	const cardClassName = cn(
		"flex w-full items-stretch gap-2 rounded-lg bg-white dark:bg-zinc-800 py-3 px-2 shadow-none backdrop-blur-sm",
		"transition-shadow hover:shadow-md",
		onClick &&
			"cursor-pointer select-none active:scale-[0.98] transition-transform",
	);

	const cardContent = (
		<>
			{/* State indicator — vertical colored rectangle */}
			<div
				className={cn("w-1 shrink-0 self-stretch rounded-full", indicatorClass)}
			/>

			{/* Card content */}
			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				{/* Room name + type badge */}
				<div className="flex w-full items-center justify-between">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-200 leading-tight">
							{room.name}
						</span>
					</div>

					<Badge
						variant="outline"
						className="w-fit text-[10px] uppercase px-1.5 py-0 bg-zinc-200 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300 font-bold"
					>
						{room.typeAbbreviation}
					</Badge>
				</div>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Current / last user */}
				{authenticated && displayUser && (
					<div className="flex items-center gap-0.5 text-xs text-zinc-400 truncate">
						<Icon
							icon="solar:user-bold"
							className="size-4 shrink-0 text-zinc-400"
						/>
						<span className="truncate italic">{displayUser.name}</span>
					</div>
				)}

				{/* Last update timestamp */}
				{formattedTime ? (
					<span
						className="text-[11px] text-zinc-400 leading-tight"
						title={fullDateTime ?? undefined}
					>
						{formattedTime}
					</span>
				) : (
					<span className="text-[11px] text-zinc-300 leading-tight">
						Sem registro
					</span>
				)}
			</div>
		</>
	);

	if (onClick) {
		return (
			<button
				type="button"
				className={cn(cardClassName, "text-left")}
				onClick={onClick}
			>
				{cardContent}
			</button>
		);
	}

	return <div className={cardClassName}>{cardContent}</div>;
}
