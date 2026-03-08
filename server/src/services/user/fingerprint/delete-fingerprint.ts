import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";

export class FingerprintNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FingerprintNotFoundError";
	}
}

export async function deleteFingerprint(
	userId: string,
	credentialId: string,
): Promise<void> {
	const deleted = await db
		.delete(accessCredential)
		.where(
			and(
				eq(accessCredential.id, credentialId),
				eq(accessCredential.userId, userId),
				eq(accessCredential.type, "FINGERPRINT"),
			),
		)
		.returning({ id: accessCredential.id });

	if (deleted.length === 0) {
		throw new FingerprintNotFoundError(
			"Digital não encontrada ou não pertence a este usuário.",
		);
	}
}

export async function toggleFingerprint(
	userId: string,
	credentialId: string,
	isActive: boolean,
): Promise<{ id: string; finger: string; isActive: boolean; createdAt: Date }> {
	const updated = await db
		.update(accessCredential)
		.set({ isActive })
		.where(
			and(
				eq(accessCredential.id, credentialId),
				eq(accessCredential.userId, userId),
				eq(accessCredential.type, "FINGERPRINT"),
			),
		)
		.returning({
			id: accessCredential.id,
			finger: accessCredential.finger,
			isActive: accessCredential.isActive,
			createdAt: accessCredential.createdAt,
		});

	if (updated.length === 0) {
		throw new FingerprintNotFoundError(
			"Digital não encontrada ou não pertence a este usuário.",
		);
	}

	const row = updated[0];
	return {
		id: row.id,
		finger: row.finger as string,
		isActive: row.isActive,
		createdAt: row.createdAt,
	};
}
