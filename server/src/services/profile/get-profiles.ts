import { db } from "@/db";
import { profile } from "@/db/schema/profile";

export const getProfiles = async () => {
	const rows = await db.select().from(profile);
	return { result: rows.map((r) => ({ ...r })) } as const;
};
