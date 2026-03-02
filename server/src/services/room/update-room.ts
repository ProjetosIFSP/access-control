import { db } from "@/db";
import { room } from "@/db/schema/room";
import { eq } from "drizzle-orm";

export async function updateRoom(data: {
	id: string;
	name?: string;
	blockId?: string;
	typeId?: string;
	requiresBiometry?: boolean;
	requiresRFID?: boolean;
}) {
	const { id, ...fields } = data;
	await db.update(room).set(fields).where(eq(room.id, id));
	const rows = await db.select().from(room).where(eq(room.id, id));
	return rows[0];
}
