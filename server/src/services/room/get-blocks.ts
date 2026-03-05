import { asc } from "drizzle-orm";
import { db } from "@/db";
import { block } from "@/db/schema/room";

export async function getBlocks() {
	const result = await db
		.select({ id: block.id, name: block.name })
		.from(block)
		.orderBy(asc(block.name));
	return { result };
}
