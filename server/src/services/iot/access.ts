import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential, accessLog } from "@/db/schema/access";
import { doorController } from "@/db/schema/door";
import { accessStatusEnum, credentialTypeEnum } from "@/db/schema/enums";
import { verifyAccess } from "@/services/permissions/verify-access";
import crypto from "crypto";

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

interface ProcessLocalMatchInput {
	controllerId: string;
	credentialId: string;
}

interface AccessDecision {
	status: AccessStatus;
	reason: string | null;
	credentialId?: string;
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
} as const;

export async function processAccessAttempt(
	input: ProcessAccessAttemptInput,
): Promise<AccessDecision> {
	const { controllerId, credentialType, credentialValue, requestId } = input;
	const now = new Date();

	const searchValue =
		credentialType === "FINGERPRINT"
			? crypto.createHash("sha256").update(credentialValue).digest("hex")
			: credentialValue;

	// Buscar controlador
	const [controllerRecord] = await db
		.select({
			id: doorController.id,
			roomId: doorController.roomId,
		})
		.from(doorController)
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
		.where(eq(doorController.id, controllerRecord.id));

	// Dispositivo em modo pareamento — apenas registra leitura, não verifica acesso
	if (!controllerRecord.roomId) {
		return {
			status: "DENIED",
			reason: "PAIRING_MODE",
			requestId,
		};
	}

	const verifyResult = await verifyAccess({
		roomId: controllerRecord.roomId,
		credentialValue: searchValue,
		type: credentialType,
	});

	if (verifyResult.room) {
		await db.insert(accessLog).values({
			roomId: verifyResult.room.id,
			userId: verifyResult.user?.id ?? null,
			accessCredentialId: verifyResult.credentialId ?? null,
			credentialValueUsed: searchValue,
			status: verifyResult.granted ? "GRANTED" : "DENIED",
			reason: verifyResult.reason,
		});
	}

	return {
		status: verifyResult.granted ? "GRANTED" : "DENIED",
		reason: verifyResult.reason,
		credentialId: verifyResult.credentialId,
		room: verifyResult.room,
		user: verifyResult.user,
		requestId,
	};
}

export async function processLocalMatch(
	input: ProcessLocalMatchInput,
): Promise<AccessDecision> {
	const { controllerId, credentialId } = input;
	const now = new Date();

	// Buscar controlador
	const [controllerRecord] = await db
		.select({
			id: doorController.id,
			roomId: doorController.roomId,
		})
		.from(doorController)
		.where(eq(doorController.id, controllerId));

	if (!controllerRecord) {
		return { status: "DENIED", reason: DENY_REASONS.UNKNOWN_CONTROLLER };
	}

	await db
		.update(doorController)
		.set({ lastSeenAt: now })
		.where(eq(doorController.id, controllerRecord.id));

	if (!controllerRecord.roomId) {
		return { status: "DENIED", reason: "PAIRING_MODE" };
	}

	// Buscar credencial pelo ID
	const [cred] = await db
		.select({
			id: accessCredential.id,
			userId: accessCredential.userId,
			value: accessCredential.value,
			isActive: accessCredential.isActive,
		})
		.from(accessCredential)
		.where(eq(accessCredential.id, credentialId))
		.limit(1);

	if (!cred) {
		return {
			status: "DENIED",
			reason: "UNKNOWN_CREDENTIAL",
			room: undefined,
		};
	}

	// Reutiliza verifyAccess passando o value da credencial encontrada
	const verifyResult = await verifyAccess({
		roomId: controllerRecord.roomId,
		credentialValue: cred.value,
		type: "FINGERPRINT",
	});

	if (verifyResult.room) {
		await db.insert(accessLog).values({
			roomId: verifyResult.room.id,
			userId: verifyResult.user?.id ?? null,
			accessCredentialId: verifyResult.credentialId ?? null,
			credentialValueUsed: `local-match:${credentialId}`,
			status: verifyResult.granted ? "GRANTED" : "DENIED",
			reason: verifyResult.reason,
		});
	}

	return {
		status: verifyResult.granted ? "GRANTED" : "DENIED",
		reason: verifyResult.reason,
		credentialId: verifyResult.credentialId,
		room: verifyResult.room,
		user: verifyResult.user,
	};
}
