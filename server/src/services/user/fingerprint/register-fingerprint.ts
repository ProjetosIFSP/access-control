import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";
import type { fingerKeyEnum } from "@/db/schema/enums";

type FingerKey = (typeof fingerKeyEnum.enumValues)[number];

export interface RegisterFingerprintInput {
	userId: string;
	finger: FingerKey;
	/** Raw template captured by the reader (hex string or keyboard-emulation string) */
	template: string;
	/** ID do controlador físico que realizou a captura (terminal de enrollment via MQTT) */
	enrolledByControllerId?: string;
}

export interface RegisteredFingerprintRecord {
	id: string;
	finger: FingerKey;
	isActive: boolean;
	createdAt: Date;
}

export class FingerprintConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FingerprintConflictError";
	}
}

export class FingerprintDuplicateTemplateError extends Error {
	constructor() {
		super("Este template biométrico já está cadastrado no sistema.");
		this.name = "FingerprintDuplicateTemplateError";
	}
}

export async function registerFingerprint(
	input: RegisterFingerprintInput,
): Promise<RegisteredFingerprintRecord> {
	const { userId, finger, template, enrolledByControllerId } = input;

	try {
		const [inserted] = await db
			.insert(accessCredential)
			.values({
				id: uuidv7(),
				userId,
				type: "FINGERPRINT",
				finger,
				value: template,
				isActive: true,
				...(enrolledByControllerId ? { enrolledByControllerId } : {}),
			})
			.returning({
				id: accessCredential.id,
				finger: accessCredential.finger,
				isActive: accessCredential.isActive,
				createdAt: accessCredential.createdAt,
			});

		return {
			id: inserted.id,
			finger: inserted.finger as FingerKey,
			isActive: inserted.isActive,
			createdAt: inserted.createdAt,
		};
	} catch (err) {
		if (isUniqueViolation(err)) {
			const conflictColumn = getConflictColumn(err);

			if (conflictColumn === "value") {
				throw new FingerprintDuplicateTemplateError();
			}

			// Unique violation on (userId, finger) composite — finger already registered
			throw new FingerprintConflictError(
				`Já existe uma digital cadastrada para o dedo "${finger}" deste usuário.`,
			);
		}
		throw err;
	}
}

function isUniqueViolation(err: unknown): boolean {
	return (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		(err as { code: string }).code === "23505"
	);
}

function getConflictColumn(err: unknown): string | null {
	if (
		typeof err === "object" &&
		err !== null &&
		"constraint" in err
	) {
		const constraint = (err as { constraint: string }).constraint ?? "";
		if (constraint.includes("value")) return "value";
	}
	return null;
}
