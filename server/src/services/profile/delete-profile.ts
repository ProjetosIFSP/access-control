import { db } from "@/db";
import { profile } from "@/db/schema/profile";
import { eq } from "drizzle-orm";

export async function deleteProfile(id: string): Promise<void> {
	await db.delete(profile).where(eq(profile.id, id));
}
