import crypto from "node:crypto";
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
	/** ID do controlador físico que realizou a captura (terminal de enrollment via MQTT) */
	enrolledByControllerId?: string;
	/** Opcional: ID predefinido para a credencial (ex: para sync imediato com o hardware) */
	id?: string;
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
	const { userId, finger, template, enrolledByControllerId, id: providedId } = input;

	try {
		const templateHash = crypto
			.createHash("sha256")
			.update(template)
			.digest("hex");

		return await db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(accessCredential)
				.where(
					and(
						eq(accessCredential.userId, userId),
						eq(accessCredential.finger, finger),
						eq(accessCredential.type, "FINGERPRINT"),
					),
				);

			if (existing) {
				// Removemos a antiga para gerar um novo ID, forçando a invalidação
				// do cache no terminal biométrico.
				await tx
					.delete(accessCredential)
					.where(eq(accessCredential.id, existing.id));
			}

			const [inserted] = await tx
				.insert(accessCredential)
				.values({
					id: providedId ?? uuidv7(),
					userId,
					type: "FINGERPRINT",
					finger,
					value: templateHash,
					template,
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
		});
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
	const hasPgCode = (e: unknown): boolean =>
		typeof e === "object" &&
		e !== null &&
		"code" in e &&
		(e as { code: string }).code === "23505";

	// Drizzle ORM wraps the original PostgreSQL error inside a DrizzleError:
	// the pg error (with code "23505") lives in err.cause, not on err directly.
	return hasPgCode(err) || hasPgCode((err as { cause?: unknown })?.cause);
}

function getConflictColumn(err: unknown): string | null {
	const extract = (e: unknown): string | null => {
		if (typeof e === "object" && e !== null && "constraint" in e) {
			const constraint = (e as { constraint: string }).constraint ?? "";
			if (constraint.includes("value")) return "value";
		}
		return null;
	};

	// Check both the error itself and its Drizzle-wrapped cause.
	return extract(err) ?? extract((err as { cause?: unknown })?.cause);
}
