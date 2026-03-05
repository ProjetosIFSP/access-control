import { eq } from "drizzle-orm";
import { db } from "@/db";
import { room } from "@/db/schema/room";

export async function deleteRoom(id: string): Promise<void> {
	await db.delete(room).where(eq(room.id, id));
}
