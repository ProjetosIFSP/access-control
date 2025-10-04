import { pgEnum } from "drizzle-orm/pg-core";

export const credentialTypeEnum = pgEnum("credential_type", [
	"FINGERPRINT",
	"NFC_TAG",
]);

// Enum para o status de uma tentativa de acesso no log
export const accessStatusEnum = pgEnum("access_status", ["GRANTED", "DENIED"]);
