import { pgEnum } from "drizzle-orm/pg-core";

export const credentialTypeEnum = pgEnum("credential_type", [
	"FINGERPRINT",
	"NFC_TAG",
]);

// Enum para o status de uma tentativa de acesso no log
export const accessStatusEnum = pgEnum("access_status", ["GRANTED", "DENIED"]);

export const doorStateEnum = pgEnum("door_state", [
	"OPEN",
	"CLOSED",
	"UNKNOWN",
]);

export const doorCommandTypeEnum = pgEnum("door_command_type", [
	"UNLOCK",
	"LOCK",
	"SYNC_STATE",
]);

export const doorCommandStatusEnum = pgEnum("door_command_status", [
	"PENDING",
	"SENT",
	"COMPLETED",
	"FAILED",
	"EXPIRED",
]);
