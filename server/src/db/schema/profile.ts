import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { user } from "./auth";
import { room, roomType } from "./room";

// Perfil (role) que agrupa permissões por sala
export const profile = pgTable("profile", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text("name").notNull().unique(),
	description: text("description").notNull().default(""),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// Associação N:N entre usuário e perfil
export const userProfile = pgTable("user_profile", {
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	profileId: text("profile_id")
		.notNull()
		.references(() => profile.id, { onDelete: "cascade" }),
});

// Permissão de perfil para uma sala
export const profileRoomPermission = pgTable("profile_room_permission", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	profileId: text("profile_id")
		.notNull()
		.references(() => profile.id, { onDelete: "cascade" }),
	roomId: text("room_id")
		.notNull()
		.references(() => room.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// Permissão de perfil para todos os recursos de um tipo de sala
export const profileRoomTypePermission = pgTable(
	"profile_room_type_permission",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		profileId: text("profile_id")
			.notNull()
			.references(() => profile.id, { onDelete: "cascade" }),
		roomTypeId: text("room_type_id")
			.notNull()
			.references(() => roomType.id, { onDelete: "cascade" }),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
);
