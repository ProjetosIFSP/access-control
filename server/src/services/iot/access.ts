import { db } from "@/db";
import { accessCredential, accessLog, userRoomPermission } from "@/db/schema/access";
import { accessStatusEnum, credentialTypeEnum } from "@/db/schema/enums";
import { doorController } from "@/db/schema/door";
import { room } from "@/db/schema/room";
import { user } from "@/db/schema/auth";
import { and, eq } from "drizzle-orm";

const ACCESS_STATUSES = accessStatusEnum.enumValues;
const CREDENTIAL_TYPES = credentialTypeEnum.enumValues;

type AccessStatus = (typeof ACCESS_STATUSES)[number];
type CredentialType = (typeof CREDENTIAL_TYPES)[number];

interface ProcessAccessAttemptInput {
	controllerId: string;
	credentialType: CredentialType;
	credentialValue: string;
	requestId?: string;
}

interface AccessDecision {
	status: AccessStatus;
	reason: string | null;
	user?: {
		id: string;
		name: string;
		isAdmin: boolean;
	};
	room?: {
		id: string;
		name: string;
	};
	requestId?: string;
}

const DENY_REASONS = {
	UNKNOWN_CONTROLLER: "UNKNOWN_CONTROLLER",
	UNKNOWN_CREDENTIAL: "UNKNOWN_CREDENTIAL",
	CREDENTIAL_DISABLED: "CREDENTIAL_DISABLED",
	NO_PERMISSION: "NO_PERMISSION",
	EXPIRED_PERMISSION: "EXPIRED_PERMISSION",
} as const;

export async function processAccessAttempt(
	input: ProcessAccessAttemptInput,
): Promise<AccessDecision> {
	const { controllerId, credentialType, credentialValue, requestId } = input;
	const now = new Date();

	const [controllerRecord] = await db
		.select({
			controller: {
				id: doorController.id,
				roomId: doorController.roomId,
			},
			room: {
				id: room.id,
				name: room.name,
			},
		})
		.from(doorController)
		.innerJoin(room, eq(room.id, doorController.roomId))
		.where(eq(doorController.id, controllerId));

	if (!controllerRecord) {
		return {
			status: "DENIED",
			reason: DENY_REASONS.UNKNOWN_CONTROLLER,
			requestId,
		};
	}

	await db
		.update(doorController)
		.set({ lastSeenAt: now })
		.where(eq(doorController.id, controllerRecord.controller.id));

	const [credentialRecord] = await db
		.select({
			credential: {
				id: accessCredential.id,
				userId: accessCredential.userId,
				isActive: accessCredential.isActive,
				type: accessCredential.type,
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
				eq(accessCredential.value, credentialValue),
				eq(accessCredential.type, credentialType),
			),
		)
		.limit(1);

	if (!credentialRecord) {
		await db.insert(accessLog).values({
			roomId: controllerRecord.room.id,
			userId: null,
			accessCredentialId: null,
			credentialValueUsed: credentialValue,
			status: "DENIED",
			reason: DENY_REASONS.UNKNOWN_CREDENTIAL,
		});

		return {
			status: "DENIED",
			reason: DENY_REASONS.UNKNOWN_CREDENTIAL,
			room: controllerRecord.room,
			requestId,
		};
	}

	if (!credentialRecord.credential.isActive) {
		await db.insert(accessLog).values({
			roomId: controllerRecord.room.id,
			userId: credentialRecord.user.id,
			accessCredentialId: credentialRecord.credential.id,
			credentialValueUsed: credentialValue,
			status: "DENIED",
			reason: DENY_REASONS.CREDENTIAL_DISABLED,
		});

		return {
			status: "DENIED",
			reason: DENY_REASONS.CREDENTIAL_DISABLED,
			room: controllerRecord.room,
			user: credentialRecord.user,
			requestId,
		};
	}

	const [permission] = await db
		.select({
			id: userRoomPermission.id,
			expiresAt: userRoomPermission.expiresAt,
		})
		.from(userRoomPermission)
		.where(
			and(
				eq(userRoomPermission.userId, credentialRecord.user.id),
				eq(userRoomPermission.roomId, controllerRecord.room.id),
			),
		)
		.limit(1);

	if (!permission) {
		await db.insert(accessLog).values({
			roomId: controllerRecord.room.id,
			userId: credentialRecord.user.id,
			accessCredentialId: credentialRecord.credential.id,
			credentialValueUsed: credentialValue,
			status: "DENIED",
			reason: DENY_REASONS.NO_PERMISSION,
		});

		return {
			status: "DENIED",
			reason: DENY_REASONS.NO_PERMISSION,
			room: controllerRecord.room,
			user: credentialRecord.user,
			requestId,
		};
	}

	if (permission.expiresAt && permission.expiresAt.getTime() < now.getTime()) {
		await db.insert(accessLog).values({
			roomId: controllerRecord.room.id,
			userId: credentialRecord.user.id,
			accessCredentialId: credentialRecord.credential.id,
			credentialValueUsed: credentialValue,
			status: "DENIED",
			reason: DENY_REASONS.EXPIRED_PERMISSION,
		});

		return {
			status: "DENIED",
			reason: DENY_REASONS.EXPIRED_PERMISSION,
			room: controllerRecord.room,
			user: credentialRecord.user,
			requestId,
		};
	}

	await db.insert(accessLog).values({
		roomId: controllerRecord.room.id,
		userId: credentialRecord.user.id,
		accessCredentialId: credentialRecord.credential.id,
		credentialValueUsed: credentialValue,
		status: "GRANTED",
		reason: null,
	});

	return {
		status: "GRANTED",
		reason: null,
		room: controllerRecord.room,
		user: credentialRecord.user,
		requestId,
	};
}
