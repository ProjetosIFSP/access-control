import { RoomCard, type RoomCardItem } from "./room-card";

interface BlockSectionProps {
  blockName: string;
  rooms: RoomCardItem[];
  authenticated: boolean;
}

export function BlockSection({
  blockName,
  rooms,
  authenticated,
}: BlockSectionProps) {
  return (
    <section className="flex flex-col gap-2">
      {/* Block title */}
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
        {blockName}
      </h2>

      {/* Horizontal scrollable room cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} authenticated={authenticated} />
        ))}
      </div>
    </section>
  );
}
