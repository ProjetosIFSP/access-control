import { eq } from "drizzle-orm";
import { db } from "@/db";
import { block } from "@/db/schema/room";

export async function deleteBlock(id: string): Promise<void> {
	await db.delete(block).where(eq(block.id, id));
}
