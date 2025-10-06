import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { doorStateEnum } from "./enums";

// Tabela para agrupar salas, ex: "Prédio A", "Andar 3"
export const block = pgTable("block", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text("name").notNull().unique(),
});

// Tabela de Salas/Portas
export const room = pgTable("room", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text("name").notNull().unique(),
	blockId: text("block_id")
		.notNull()
		.references(() => block.id, { onDelete: "cascade" }),
	isLocked: boolean("is_locked").default(true),
	doorState: doorStateEnum("door_state").default("UNKNOWN").notNull(),
	lastStatusUpdateAt: timestamp("last_status_update_at", {
		withTimezone: true,
	}),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
