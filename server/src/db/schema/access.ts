import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { user } from "./auth";
import { accessStatusEnum, credentialTypeEnum } from "./enums";
import { room } from "./room";

// Tabela de Credenciais de Acesso (Digitais, Tags NFC)
export const accessCredential = pgTable("access_credential", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	type: credentialTypeEnum("type").notNull(),
	value: text("value").notNull().unique(), // Identificador da digital/tag
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// Tabela de Permissões: associa um usuário a uma sala
export const userRoomPermission = pgTable("user_room_permission", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	roomId: text("room_id")
		.notNull()
		.references(() => room.id, { onDelete: "cascade" }),
	// Se for nulo, a permissão não expira
	expiresAt: timestamp("expires_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

// Tabela de Log de Acessos
export const accessLog = pgTable("access_log", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	roomId: text("room_id")
		.notNull()
		.references(() => room.id, { onDelete: "cascade" }),
	// Pode ser nulo se a credencial não for reconhecida
	userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
	accessCredentialId: text("access_credential_id").references(
		() => accessCredential.id,
		{ onDelete: "set null" },
	),
	// Guarda o valor da credencial usada na tentativa
	credentialValueUsed: text("credential_value_used").notNull(),
	status: accessStatusEnum("status").notNull(),
	reason: text("reason"), // Ex: "NO_PERMISSION", "UNKNOWN_CREDENTIAL"
	timestamp: timestamp("timestamp", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
