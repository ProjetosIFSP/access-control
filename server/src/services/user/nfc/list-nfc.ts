import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";

export interface NfcRecord {
	id: string;
	value: string;
	isActive: boolean;
	createdAt: Date;
}

export async function listNfcTags(userId: string): Promise<NfcRecord[]> {
	const rows = await db
		.select({
			id: accessCredential.id,
			value: accessCredential.value,
			isActive: accessCredential.isActive,
			createdAt: accessCredential.createdAt,
		})
		.from(accessCredential)
		.where(
			and(
				eq(accessCredential.userId, userId),
				eq(accessCredential.type, "NFC_TAG"),
			),
		)
		.orderBy(asc(accessCredential.createdAt));

	return rows.map((row) => ({
		id: row.id,
		value: row.value,
		isActive: row.isActive,
		createdAt: row.createdAt,
	}));
}
