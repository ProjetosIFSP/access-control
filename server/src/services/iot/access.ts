import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential, accessLog } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { doorController } from "@/db/schema/door";
import { accessStatusEnum, credentialTypeEnum } from "@/db/schema/enums";
import { room } from "@/db/schema/room";
import { checkUserRoomAccess } from "@/services/permissions/check-user-room-access";

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

const GRANT_REASONS = {
	ADMIN_OVERRIDE: "ADMIN_OVERRIDE",
	DIRECT_USER_ROOM: "DIRECT_USER_ROOM",
	DIRECT_USER_ROOM_TYPE: "DIRECT_USER_ROOM_TYPE",
	PROFILE_ROOM: "PROFILE_ROOM",
	PROFILE_ROOM_TYPE: "PROFILE_ROOM_TYPE",
} as const;

export async function processAccessAttempt(
	input: ProcessAccessAttemptInput,
): Promise<AccessDecision> {
	const { controllerId, credentialType, credentialValue, requestId } = input;
	const now = new Date();

	// Buscar controlador + sala (inclui typeId para verificação por tipo)
	const [controllerRecord] = await db
		.select({
			controller: {
				id: doorController.id,
				roomId: doorController.roomId,
			},
			room: {
				id: room.id,
				name: room.name,
				typeId: room.typeId,
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

	// Buscar credencial + usuário
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

	// Curto-circuito: admins têm acesso irrestrito
	if (credentialRecord.user.isAdmin) {
		await db.insert(accessLog).values({
			roomId: controllerRecord.room.id,
			userId: credentialRecord.user.id,
			accessCredentialId: credentialRecord.credential.id,
			credentialValueUsed: credentialValue,
			status: "GRANTED",
			reason: GRANT_REASONS.ADMIN_OVERRIDE,
		});

		return {
			status: "GRANTED",
			reason: GRANT_REASONS.ADMIN_OVERRIDE,
			room: controllerRecord.room,
			user: credentialRecord.user,
			requestId,
		};
	}

	// Verificação unificada: 4 níveis de permissão (PERM-001 a PERM-004)
	const permissionResult = await checkUserRoomAccess(
		credentialRecord.user.id,
		controllerRecord.room.id,
		controllerRecord.room.typeId,
	);

	if (!permissionResult.granted) {
		await db.insert(accessLog).values({
			roomId: controllerRecord.room.id,
			userId: credentialRecord.user.id,
			accessCredentialId: credentialRecord.credential.id,
			credentialValueUsed: credentialValue,
			status: "DENIED",
			reason: permissionResult.reason,
		});

		return {
			status: "DENIED",
			reason: permissionResult.reason,
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
		reason: permissionResult.reason,
	});

	return {
		status: "GRANTED",
		reason: permissionResult.reason,
		room: controllerRecord.room,
		user: credentialRecord.user,
		requestId,
	};
}
