import { db } from "@/db";
import {
	profile,
	userProfile,
	profileRoomPermission,
	profileRoomTypePermission,
} from "@/db/schema/profile";
import { eq, and, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

interface UpdateProfileInput {
	id: string;
	name?: string;
	description?: string;
	userIds?: string[];
	roomIds?: string[];
	roomTypeIds?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function syncProfileUsers(profileId: string, nextIds: string[]) {
	const current = await db
		.select({ userId: userProfile.userId })
		.from(userProfile)
		.where(eq(userProfile.profileId, profileId));

	const currentSet = new Set(current.map((r) => r.userId));
	const nextSet = new Set(nextIds);

	const toAdd = nextIds.filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

	if (toAdd.length > 0) {
		await db
			.insert(userProfile)
			.values(toAdd.map((userId) => ({ userId, profileId })))
			.onConflictDoNothing();
	}

	if (toRemove.length > 0) {
		await db
			.delete(userProfile)
			.where(
				and(
					eq(userProfile.profileId, profileId),
					inArray(userProfile.userId, toRemove),
				),
			);
	}
}

async function syncProfileRoomTypes(profileId: string, nextIds: string[]) {
	const current = await db
		.select({ roomTypeId: profileRoomTypePermission.roomTypeId })
		.from(profileRoomTypePermission)
		.where(eq(profileRoomTypePermission.profileId, profileId));

	const currentSet = new Set(current.map((r) => r.roomTypeId));
	const nextSet = new Set(nextIds);

	const toAdd = nextIds.filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

	if (toAdd.length > 0) {
		await db
			.insert(profileRoomTypePermission)
			.values(
				toAdd.map((roomTypeId) => ({
					id: uuidv7(),
					profileId,
					roomTypeId,
				})),
			)
			.onConflictDoNothing();
	}

	if (toRemove.length > 0) {
		await db
			.delete(profileRoomTypePermission)
			.where(
				and(
					eq(profileRoomTypePermission.profileId, profileId),
					inArray(profileRoomTypePermission.roomTypeId, toRemove),
				),
			);
	}
}

async function syncProfileRooms(profileId: string, nextIds: string[]) {
	const current = await db
		.select({ roomId: profileRoomPermission.roomId })
		.from(profileRoomPermission)
		.where(eq(profileRoomPermission.profileId, profileId));

	const currentSet = new Set(current.map((r) => r.roomId));
	const nextSet = new Set(nextIds);

	const toAdd = nextIds.filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

	if (toAdd.length > 0) {
		await db
			.insert(profileRoomPermission)
			.values(
				toAdd.map((roomId) => ({ id: uuidv7(), profileId, roomId })),
			)
			.onConflictDoNothing();
	}

	if (toRemove.length > 0) {
		await db
			.delete(profileRoomPermission)
			.where(
				and(
					eq(profileRoomPermission.profileId, profileId),
					inArray(profileRoomPermission.roomId, toRemove),
				),
			);
	}
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function updateProfile({
	id,
	name,
	description,
	userIds,
	roomIds,
	roomTypeIds,
}: UpdateProfileInput) {
	const updates: Partial<{ name: string; description: string }> = {};
	if (name !== undefined) updates.name = name;
	if (description !== undefined) updates.description = description;

	if (Object.keys(updates).length > 0) {
		await db.update(profile).set(updates).where(eq(profile.id, id));
	}

	if (userIds !== undefined) {
		await syncProfileUsers(id, userIds);
	}

	if (roomIds !== undefined) {
		await syncProfileRooms(id, roomIds);
	}

	if (roomTypeIds !== undefined) {
		await syncProfileRoomTypes(id, roomTypeIds);
	}

	const rows = await db.select().from(profile).where(eq(profile.id, id));

	if (!rows[0]) throw new Error("Perfil não encontrado");

	return rows[0];
}
