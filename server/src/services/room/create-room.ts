import { db } from "@/db";
import { room } from "@/db/schema/room";
import { profileRoomPermission } from "@/db/schema/profile";
import { userRoomPermission } from "@/db/schema/access";
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";

interface CreateRoomInput {
	name: string;
	blockId: string;
	typeId: string;
	requiresBiometry?: boolean;
	requiresRFID?: boolean;
	profileIds?: string[];
	userIds?: string[];
}

export async function createRoom({
	name,
	blockId,
	typeId,
	requiresBiometry = false,
	requiresRFID = false,
	profileIds = [],
	userIds = [],
}: CreateRoomInput) {
	const id = uuidv7();

	await db.insert(room).values({
		id,
		name,
		blockId,
		typeId,
		requiresBiometry,
		requiresRFID,
	});

	// Assign profile permissions to the new room
	if (profileIds.length > 0) {
		await db
			.insert(profileRoomPermission)
			.values(
				profileIds.map((profileId) => ({ id: uuidv7(), profileId, roomId: id })),
			)
			.onConflictDoNothing();
	}

	// Assign direct user permissions to the new room
	if (userIds.length > 0) {
		await db
			.insert(userRoomPermission)
			.values(
				userIds.map((userId) => ({ id: uuidv7(), userId, roomId: id })),
			)
			.onConflictDoNothing();
	}

	const rows = await db.select().from(room).where(eq(room.id, id));
	return rows[0];
}
