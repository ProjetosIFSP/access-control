import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";
import { UserRound } from "lucide-react";
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
}

// ── State config ──────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<
  RoomState,
  { indicatorClass: string; label: string }
> = {
  aberta: {
    indicatorClass: "bg-primary",
    label: "Livre",
  },
  alerta: {
    indicatorClass: "bg-red-700 dark:bg-red-600",
    label: "Alerta",
  },
  fechada: {
    indicatorClass: "bg-zinc-700 dark:bg-zinc-300",
    label: "Em uso",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function RoomCard({ room, authenticated }: RoomCardProps) {
  const { indicatorClass } = STATE_CONFIG[room.state];

  const displayUser =
    room.state === "fechada" ? room.currentUser : room.lastUser;

  const formattedTime = room.lastStatusUpdateAt
    ? dayjs(room.lastStatusUpdateAt).isBefore(dayjs().startOf("day"))
      ? dayjs(room.lastStatusUpdateAt).fromNow()
      : dayjs(room.lastStatusUpdateAt).format("HH:mm")
    : null;

  const fullDateTime = room.lastStatusUpdateAt
    ? dayjs(room.lastStatusUpdateAt).format("DD/MM/YYYY HH:mm")
    : null;

  return (
    <div
      className={cn(
        "flex w-42 shrink-0 items-stretch gap-2 rounded-lg bg-white dark:bg-zinc-800 py-3 px-2 shadow-sm backdrop-blur-sm",
        "transition-shadow hover:shadow-md",
        "first:ml-4 first:sm:ml-8 first:md:ml-16 first:lg:ml-32 first:transition-all",
        "last:mr-4 last:sm:mr-8 last:md:mr-16 last:lg:mr-32 last:transition-all",
      )}
    >
      {/* State indicator — vertical colored rectangle */}
      <div
        className={cn("w-1 shrink-0 self-stretch rounded-full", indicatorClass)}
      />

      {/* Card content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Room name + type badge */}
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-zinc-900 leading-tight">
              {room.name}
            </span>
          </div>

          <Badge
            variant="outline"
            className="w-fit text-[10px] uppercase px-1.5 py-0 bg-zinc-400 text-zinc-100 font-bold"
          >
            {room.typeAbbreviation}
          </Badge>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Current / last user */}
        {authenticated && displayUser && (
          <div className="flex items-center gap-1 text-xs text-zinc-500 truncate">
            <UserRound className="size-3 shrink-0 text-zinc-400" />
            <span className="truncate">{displayUser.name}</span>
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
    </div>
  );
}
