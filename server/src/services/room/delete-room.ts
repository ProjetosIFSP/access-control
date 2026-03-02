import { db } from "@/db";
import { room } from "@/db/schema/room";
import { eq } from "drizzle-orm";

export async function deleteRoom(id: string): Promise<void> {
	await db.delete(room).where(eq(room.id, id));
}
