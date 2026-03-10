import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";

export interface FingerprintRecord {
	id: string;
	finger: string;
	isActive: boolean;
	createdAt: Date;
}

export async function listFingerprints(
	userId: string,
): Promise<FingerprintRecord[]> {
	const rows = await db
		.select({
			id: accessCredential.id,
			finger: accessCredential.finger,
			isActive: accessCredential.isActive,
			createdAt: accessCredential.createdAt,
		})
		.from(accessCredential)
		.where(
			and(
				eq(accessCredential.userId, userId),
				eq(accessCredential.type, "FINGERPRINT"),
			),
		)
		.orderBy(asc(accessCredential.createdAt));

	return rows.map((row) => ({
		id: row.id,
		finger: row.finger as string,
		isActive: row.isActive,
		createdAt: row.createdAt,
	}));
}
