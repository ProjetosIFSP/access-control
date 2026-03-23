import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";

export interface RegisterNfcInput {
	userId: string;
	/** UID do cartão NFC (hex string) */
	value: string;
	/** ID do controlador físico que realizou a leitura, se aplicável */
	enrolledByControllerId?: string;
}

export interface RegisteredNfcRecord {
	id: string;
	value: string;
	isActive: boolean;
	createdAt: Date;
}

export class NfcDuplicateError extends Error {
	constructor() {
		super("Este cartão NFC já está cadastrado no sistema.");
		this.name = "NfcDuplicateError";
	}
}

export async function registerNfcTag(
	input: RegisterNfcInput,
): Promise<RegisteredNfcRecord> {
	const { userId, value, enrolledByControllerId } = input;

	try {
		const [inserted] = await db
			.insert(accessCredential)
			.values({
				id: uuidv7(),
				userId,
				type: "NFC_TAG",
				value,
				isActive: true,
				...(enrolledByControllerId ? { enrolledByControllerId } : {}),
			})
			.returning({
				id: accessCredential.id,
				value: accessCredential.value,
				isActive: accessCredential.isActive,
				createdAt: accessCredential.createdAt,
			});

		return {
			id: inserted.id,
			value: inserted.value,
			isActive: inserted.isActive,
			createdAt: inserted.createdAt,
		};
	} catch (err) {
		if (isUniqueViolation(err)) {
			throw new NfcDuplicateError();
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
