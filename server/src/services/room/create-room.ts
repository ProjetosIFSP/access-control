import { db } from "@/db";
import { room } from "@/db/schema/room";
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";

export async function createRoom(data: {
	name: string;
	blockId: string;
	typeId: string;
	requiresBiometry?: boolean;
	requiresRFID?: boolean;
}) {
	const id = uuidv7();
	await db.insert(room).values({
		id,
		name: data.name,
		blockId: data.blockId,
		typeId: data.typeId,
		requiresBiometry: data.requiresBiometry ?? false,
		requiresRFID: data.requiresRFID ?? false,
	});
	const rows = await db.select().from(room).where(eq(room.id, id));
	return rows[0];
}
