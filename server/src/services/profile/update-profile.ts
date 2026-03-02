import { db } from "@/db";
import { profile } from "@/db/schema/profile";
import { eq } from "drizzle-orm";

export async function updateProfile(data: {
	id: string;
	name?: string;
	description?: string;
}) {
	const { id, ...fields } = data;
	await db.update(profile).set(fields).where(eq(profile.id, id));
	const rows = await db.select().from(profile).where(eq(profile.id, id));
	return rows[0];
}
