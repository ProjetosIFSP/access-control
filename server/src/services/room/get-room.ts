import { eq } from "drizzle-orm";
import { db } from "@/db";
import { block, room } from "@/db/schema/room";

export async function getRooms() {
	const result = await db
		.select()
		.from(room)
		.innerJoin(block, eq(block.id, room.blockId))
		.orderBy(block.name, room.name);

	return { result };
}
