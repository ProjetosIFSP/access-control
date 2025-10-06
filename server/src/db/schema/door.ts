import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { doorCommandStatusEnum, doorCommandTypeEnum } from "./enums";
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

export const doorCommand = pgTable("door_command", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	controllerId: text("controller_id")
		.notNull()
		.references(() => doorController.id, { onDelete: "cascade" }),
	type: doorCommandTypeEnum("type").notNull(),
	status: doorCommandStatusEnum("status").notNull().default("PENDING"),
	payload: jsonb("payload")
		.$type<Record<string, unknown>>()
		.notNull()
		.default(sql`'{}'::jsonb`),
	resultPayload: jsonb("result_payload")
		.$type<Record<string, unknown> | null>()
		.default(sql`NULL`),
	errorMessage: text("error_message"),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	sentAt: timestamp("sent_at", { withTimezone: true }),
	processedAt: timestamp("processed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});
