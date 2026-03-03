import type { ReactNode } from "react";

// ── ProfileTooltipContent ─────────────────────────────────────────────────────

export function ProfileTooltipContent({
  roomTypes,
  rooms,
}: {
  roomTypes: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
}): ReactNode {
  const hasTypes = roomTypes.length > 0;
  const hasRooms = rooms.length > 0;
  if (!hasTypes && !hasRooms) return null;
  return (
    <div className="flex flex-col gap-2 py-0.5">
      {hasTypes && (
        <div>
          <p className="mb-1 font-semibold text-background/70 uppercase tracking-wide text-[10px]">
            Tipos de sala
          </p>
          <ul className="flex flex-col gap-0.5">
            {roomTypes.map((rt) => (
              <li key={rt.id} className="text-xs">
                {rt.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {hasTypes && hasRooms && (
        <div className="border-t border-background/20" />
      )}
      {hasRooms && (
        <div>
          <p className="mb-1 font-semibold text-background/70 uppercase tracking-wide text-[10px]">
            Salas específicas
          </p>
          <ul className="flex flex-col gap-0.5">
            {rooms.map((r) => (
              <li key={r.id} className="text-xs">
                {r.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── RoomTypeTooltipContent ────────────────────────────────────────────────────

export function RoomTypeTooltipContent({
  rooms,
}: {
  rooms: { value: string; label: string; sublabel?: string }[];
}): ReactNode {
  if (rooms.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 py-0.5">
      <p className="mb-1 font-semibold text-background/70 uppercase tracking-wide text-[10px]">
        Salas incluídas
      </p>
      <ul className="flex flex-col gap-0.5">
        {rooms.map((r) => (
          <li key={r.value} className="text-xs">
            {r.label}
            {r.sublabel && (
              <span className="text-background/60"> · {r.sublabel}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
