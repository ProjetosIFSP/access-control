import { and, eq } from "drizzle-orm";
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

export async function registerFingerprint(
	input: RegisterFingerprintInput,
): Promise<RegisteredFingerprintRecord> {
	const { userId, finger, template } = input;

	// Check if this finger already has a registered credential for this user
	const existing = await db
		.select({ id: accessCredential.id })
		.from(accessCredential)
		.where(
			and(
				eq(accessCredential.userId, userId),
				eq(accessCredential.type, "FINGERPRINT"),
				eq(accessCredential.finger, finger),
			),
		)
		.limit(1);

	if (existing.length > 0) {
		throw new FingerprintConflictError(
			`Já existe uma digital cadastrada para o dedo "${finger}" deste usuário.`,
		);
	}

	// The `value` field stores the raw template. It has a UNIQUE constraint,
	// so duplicate templates across all users will be rejected by the DB.
	const [inserted] = await db
		.insert(accessCredential)
		.values({
			id: uuidv7(),
			userId,
			type: "FINGERPRINT",
			finger,
			value: template,
			isActive: true,
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
}
