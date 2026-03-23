import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";

export class NfcNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NfcNotFoundError";
	}
}

export async function deleteNfcTag(
	userId: string,
	credentialId: string,
): Promise<void> {
	const deleted = await db
		.delete(accessCredential)
		.where(
			and(
				eq(accessCredential.id, credentialId),
				eq(accessCredential.userId, userId),
				eq(accessCredential.type, "NFC_TAG"),
			),
		)
		.returning({ id: accessCredential.id });

	if (deleted.length === 0) {
		throw new NfcNotFoundError(
			"Cartão NFC não encontrado ou não pertence a este usuário.",
		);
	}
}

export async function toggleNfcTag(
	userId: string,
	credentialId: string,
	isActive: boolean,
): Promise<{ id: string; value: string; isActive: boolean; createdAt: Date }> {
	const updated = await db
		.update(accessCredential)
		.set({ isActive })
		.where(
			and(
				eq(accessCredential.id, credentialId),
				eq(accessCredential.userId, userId),
				eq(accessCredential.type, "NFC_TAG"),
			),
		)
		.returning({
			id: accessCredential.id,
			value: accessCredential.value,
			isActive: accessCredential.isActive,
			createdAt: accessCredential.createdAt,
		});

	if (updated.length === 0) {
		throw new NfcNotFoundError(
			"Cartão NFC não encontrado ou não pertence a este usuário.",
		);
	}

	const row = updated[0];
	return {
		id: row.id,
		value: row.value,
		isActive: row.isActive,
		createdAt: row.createdAt,
	};
}
