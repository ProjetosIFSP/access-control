import { pgEnum } from "drizzle-orm/pg-core";

export const credentialTypeEnum = pgEnum("credential_type", [
	"FINGERPRINT",
	"NFC_TAG",
]);

export const fingerKeyEnum = pgEnum("finger_key", [
	"right_thumb",
	"right_index",
	"right_middle",
	"right_ring",
	"right_pinky",
	"left_thumb",
	"left_index",
	"left_middle",
	"left_ring",
	"left_pinky",
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
