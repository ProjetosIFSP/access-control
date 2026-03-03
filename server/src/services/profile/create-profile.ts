import { db } from "@/db";
import {
	profile,
	userProfile,
	profileRoomPermission,
	profileRoomTypePermission,
} from "@/db/schema/profile";
import { v7 as uuidv7 } from "uuid";
import { eq } from "drizzle-orm";

interface CreateProfileInput {
	name: string;
	description?: string;
	userIds?: string[];
	roomIds?: string[];
	roomTypeIds?: string[];
}

export const createProfile = async ({
	name,
	description,
	userIds = [],
	roomIds = [],
	roomTypeIds = [],
}: CreateProfileInput) => {
	const id = uuidv7();

	await db.insert(profile).values({
		id,
		name,
		description: description ?? "",
	});

	// Assign users to the new profile
	if (userIds.length > 0) {
		await db
			.insert(userProfile)
			.values(userIds.map((userId) => ({ userId, profileId: id })))
			.onConflictDoNothing();
	}

	// Assign room permissions to the new profile
	if (roomIds.length > 0) {
		await db
			.insert(profileRoomPermission)
			.values(
				roomIds.map((roomId) => ({ id: uuidv7(), profileId: id, roomId })),
			)
			.onConflictDoNothing();
	}

	// Assign room-type permissions to the new profile
	if (roomTypeIds.length > 0) {
		await db
			.insert(profileRoomTypePermission)
			.values(
				roomTypeIds.map((roomTypeId) => ({
					id: uuidv7(),
					profileId: id,
					roomTypeId,
				})),
			)
			.onConflictDoNothing();
	}

	const rows = await db.select().from(profile).where(eq(profile.id, id));
	return rows[0];
};
