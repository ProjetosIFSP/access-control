import { memo } from "react";
import { RoomCard, type RoomCardItem } from "./room-card";

interface BlockSectionProps {
  blockName: string;
  rooms: RoomCardItem[];
  authenticated: boolean;
}

export const BlockSection = memo(function BlockSection({
  blockName,
  rooms,
  authenticated,
}: BlockSectionProps) {
  return (
    <section className="flex flex-col gap-2 px-4 sm:px-8 md:px-16 lg:px-32 transition-all">
      {/* Block title */}
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
        {blockName}
      </h2>

      {/* Grid of room cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} authenticated={authenticated} />
        ))}
      </div>
    </section>
  );
});
