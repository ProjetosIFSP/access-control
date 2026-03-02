import { db } from "@/db";
import { block } from "@/db/schema/room";
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";

export async function createBlock(data: { name: string }) {
	const id = uuidv7();
	await db.insert(block).values({ id, name: data.name });
	const rows = await db.select().from(block).where(eq(block.id, id));
	return rows[0];
}
