import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { room } from "@/db/schema/room";
import { checkUserRoomAccess } from "@/services/permissions/check-user-room-access";

const DENY_REASONS = {
	ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
	FINGERPRINT_REQUIRED: "FINGERPRINT_REQUIRED",
	NFC_TAG_REQUIRED: "NFC_TAG_REQUIRED",
	UNKNOWN_CREDENTIAL: "UNKNOWN_CREDENTIAL",
	CREDENTIAL_DISABLED: "CREDENTIAL_DISABLED",
} as const;

const GRANT_REASONS = {
	ADMIN_OVERRIDE: "ADMIN_OVERRIDE",
} as const;

export const verifyAccess = async (payload: {
	roomId: string;
	credentialValue: string;
	type: "FINGERPRINT" | "NFC_TAG";
}) => {
	const [r] = await db
		.select({
			id: room.id,
			name: room.name,
			typeId: room.typeId,
			requiresBiometry: room.requiresBiometry,
			requiresRFID: room.requiresRFID,
		})
		.from(room)
		.where(eq(room.id, payload.roomId))
		.limit(1);

	if (!r)
		return { granted: false, reason: DENY_REASONS.ROOM_NOT_FOUND } as const;

	if (r.requiresBiometry && payload.type !== "FINGERPRINT")
		return {
			granted: false,
			reason: DENY_REASONS.FINGERPRINT_REQUIRED,
			room: { id: r.id, name: r.name },
		} as const;
	if (r.requiresRFID && payload.type !== "NFC_TAG")
		return {
			granted: false,
			reason: DENY_REASONS.NFC_TAG_REQUIRED,
			room: { id: r.id, name: r.name },
		} as const;

	const [cred] = await db
		.select({
			credential: {
				id: accessCredential.id,
				userId: accessCredential.userId,
				isActive: accessCredential.isActive,
			},
			user: {
				id: user.id,
				name: user.name,
				isAdmin: user.isAdmin,
			},
		})
		.from(accessCredential)
		.innerJoin(user, eq(user.id, accessCredential.userId))
		.where(
			and(
				eq(accessCredential.value, payload.credentialValue),
				eq(accessCredential.type, payload.type),
			),
		)
		.limit(1);

	// If no credential or wrong type (which is covered by where clause)
	if (!cred) {
		return {
			granted: false,
			reason: DENY_REASONS.UNKNOWN_CREDENTIAL,
			room: { id: r.id, name: r.name },
		} as const;
	}


	if (!cred.credential.isActive) {
		return {
			granted: false,
			reason: DENY_REASONS.CREDENTIAL_DISABLED,
			room: { id: r.id, name: r.name },
			user: cred.user,
			credentialId: cred.credential.id,
		} as const;
	}

	// Curto-circuito: admins têm acesso irrestrito
	if (cred.user.isAdmin) {
		return {
			granted: true,
			reason: GRANT_REASONS.ADMIN_OVERRIDE,
			room: { id: r.id, name: r.name },
			user: cred.user,
			credentialId: cred.credential.id,
		} as const;
	}

	const result = await checkUserRoomAccess(
		cred.user.id,
		payload.roomId,
		r.typeId,
	);
	return {
		granted: result.granted,
		reason: result.reason,
		room: { id: r.id, name: r.name },
		user: cred.user,
		credentialId: cred.credential.id,
	} as const;
};
