import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";
import { room } from "@/db/schema/room";
import { checkUserRoomAccess } from "@/services/iot/access";

export const verifyAccess = async (payload: {
	roomId: string;
	credentialValue: string;
	type: "BIOMETRY" | "RFID";
}) => {
	const [r] = await db
		.select({
			id: room.id,
			typeId: room.typeId,
			requiresBiometry: room.requiresBiometry,
			requiresRFID: room.requiresRFID,
		})
		.from(room)
		.where(eq(room.id, payload.roomId))
		.limit(1);

	if (!r) return { granted: false, reason: "ROOM_NOT_FOUND" } as const;

	if (r.requiresBiometry && payload.type !== "BIOMETRY")
		return { granted: false, reason: "BIOMETRY_REQUIRED" } as const;
	if (r.requiresRFID && payload.type !== "RFID")
		return { granted: false, reason: "RFID_REQUIRED" } as const;

	const [cred] = await db
		.select({
			userId: accessCredential.userId,
			isActive: accessCredential.isActive,
		})
		.from(accessCredential)
		.where(
			and(
				eq(accessCredential.value, payload.credentialValue),
				eq(accessCredential.isActive, true),
			),
		)
		.limit(1);

	if (!cred?.userId) {
		return { granted: false, reason: "UNKNOWN_CREDENTIAL" } as const;
	}

	const result = await checkUserRoomAccess(cred.userId, payload.roomId, r.typeId);
	return { granted: result.granted, reason: result.reason } as const;
};
