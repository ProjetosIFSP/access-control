import { createId } from "@paralleldrive/cuid2";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
	id: text("id").primaryKey().$defaultFn(createId),
	email: text("email").notNull().unique(),
	name: text("name").notNull(),
	password: text("password").notNull(),
	isAdmin: boolean("is_admin").notNull().default(false),
});

export const block = pgTable("block", {
	id: text("id").primaryKey().$defaultFn(createId),
	name: text("name").notNull().unique(),
});

export const room = pgTable("room", {
	id: text("id").primaryKey().$defaultFn(createId),
	name: text("name").notNull().unique(),
	blockId: text("block_id")
		.notNull()
		.references(() => block.id),
	opened: boolean("opened").default(false),
	lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const reservation = pgTable("reservation", {
	id: text("id").primaryKey().$defaultFn(createId),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
	roomId: text("room_id")
		.notNull()
		.references(() => room.id),
	startTime: timestamp("start_time", { withTimezone: true }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true }).notNull(),
});

export const accessLog = pgTable("access_log", {
	id: text("id").primaryKey().$defaultFn(createId),
	userId: text("user_id")
		.notNull()
		.references(() => user.id),
	roomId: text("room_id")
		.notNull()
		.references(() => room.id),
	timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});
