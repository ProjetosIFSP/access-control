import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";
import { room } from "@/db/schema/room";
import { checkUserRoomAccess } from "@/services/iot/access";

export const verifyAccess = async (payload: {
	roomId: string;
	credentialValue: string;
	type: "BIOMETRY" | "RFID";
}) => {
	// buscar sala
	const roomRows = await db
		.select()
		.from(room)
		.where(eq(room.id, payload.roomId));
	const r = roomRows[0];
	if (!r) return { granted: false, reason: "ROOM_NOT_FOUND" } as const;

	// verificar requisitos multimodais
	if (r.requiresBiometry && payload.type !== "BIOMETRY")
		return { granted: false, reason: "BIOMETRY_REQUIRED" } as const;
	if (r.requiresRFID && payload.type !== "RFID")
		return { granted: false, reason: "RFID_REQUIRED" } as const;

	// identificar usuário pela credencial
	const credRows = await db
		.select()
		.from(accessCredential)
		.where(eq(accessCredential.value, payload.credentialValue));
	const cred = credRows[0];
	const userId = cred?.userId;

	if (!userId) {
		return { granted: false, reason: "UNKNOWN_CREDENTIAL" } as const;
	}

	// usar a lógica unificada de verificação de permissões
	const result = await checkUserRoomAccess(userId, payload.roomId, r.typeId);
	return { granted: result.granted, reason: result.reason } as const;
};
