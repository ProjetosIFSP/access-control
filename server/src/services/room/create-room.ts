import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import { userRoomPermission } from "@/db/schema/access";
import { doorController } from "@/db/schema/door";
import { profileRoomPermission } from "@/db/schema/profile";
import { room } from "@/db/schema/room";
import { bindControllerToRoom } from "@/services/iot/controller-pairing";

interface CreateRoomInput {
	name: string;
	blockId: string;
	typeId: string;
	controllerId?: string | null;
	requiresBiometry?: boolean;
	requiresRFID?: boolean;
	profileIds?: string[];
	userIds?: string[];
}

export async function createRoom({
	name,
	blockId,
	typeId,
	controllerId,
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
				profileIds.map((profileId) => ({
					id: uuidv7(),
					profileId,
					roomId: id,
				})),
			)
			.onConflictDoNothing();
	}

	// Assign direct user permissions to the new room
	if (userIds.length > 0) {
		await db
			.insert(userRoomPermission)
			.values(userIds.map((userId) => ({ id: uuidv7(), userId, roomId: id })))
			.onConflictDoNothing();
	}

	if (controllerId) {
		await bindControllerToRoom(controllerId, id);
	}

	const [createdRoom] = await db.select().from(room).where(eq(room.id, id));
	const [controller] = await db
		.select({ controllerId: doorController.id })
		.from(doorController)
		.where(eq(doorController.roomId, id));

	return {
		...createdRoom,
		controllerId: controller?.controllerId ?? null,
	};
}
