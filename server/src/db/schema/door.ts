import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { room } from "./room";

// Tabela para gerenciar os dispositivos físicos (ESP32)
export const doorController = pgTable("door_controller", {
	// Pode ser o MAC Address ou outro identificador único do hardware
	id: text("id").primaryKey(),
	roomId: text("room_id")
		.notNull()
		.unique()
		.references(() => room.id, { onDelete: "cascade" }),
	firmwareVersion: text("firmware_version"),
	lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});
