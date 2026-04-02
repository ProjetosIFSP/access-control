import { pgEnum } from "drizzle-orm/pg-core";

export const credentialTypeEnum = pgEnum("credential_type", [
	"FINGERPRINT",
	"NFC_TAG",
]);

// Protocolo do sensor biométrico — determina compatibilidade de templates
export const sensorProtocolEnum = pgEnum("sensor_protocol", [
	"R30X", // protocolo GROW/ZN-53X/A21 UART — padrão do projeto
	"BOLAND", // protocolo proprietário Boland (WA26 USB) — apenas demonstração
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
	"LOCKED",
	"UNKNOWN",
]);

export const doorCommandTypeEnum = pgEnum("door_command_type", [
	"UNLOCK",
	"LOCK",
	"TOGGLE",
	"SYNC_STATE",
	"NFC_WRITE", // Instrui o terminal NFC a gravar userId no cartão (MIFARE Classic)
]);

export const doorCommandStatusEnum = pgEnum("door_command_status", [
	"PENDING",
	"SENT",
	"COMPLETED",
	"FAILED",
	"EXPIRED",
]);
