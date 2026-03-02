import { db } from "@/db";
import { block } from "@/db/schema/room";
import { eq } from "drizzle-orm";

export async function updateBlock(data: { id: string; name: string }) {
	const { id, name } = data;
	await db.update(block).set({ name }).where(eq(block.id, id));
	const rows = await db.select().from(block).where(eq(block.id, id));
	return rows[0];
}
