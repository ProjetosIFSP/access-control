import { and, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import { userRoomPermission } from "@/db/schema/access";
import { profileRoomPermission } from "@/db/schema/profile";
import { room } from "@/db/schema/room";

interface UpdateRoomInput {
	id: string;
	name?: string;
	blockId?: string;
	typeId?: string;
	requiresBiometry?: boolean;
	requiresRFID?: boolean;
	profileIds?: string[];
	userIds?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function syncRoomProfiles(roomId: string, nextIds: string[]) {
	const current = await db
		.select({ profileId: profileRoomPermission.profileId })
		.from(profileRoomPermission)
		.where(eq(profileRoomPermission.roomId, roomId));

	const currentSet = new Set(current.map((r) => r.profileId));
	const nextSet = new Set(nextIds);

	const toAdd = nextIds.filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

	if (toAdd.length > 0) {
		await db
			.insert(profileRoomPermission)
			.values(toAdd.map((profileId) => ({ id: uuidv7(), profileId, roomId })))
			.onConflictDoNothing();
	}

	if (toRemove.length > 0) {
		await db
			.delete(profileRoomPermission)
			.where(
				and(
					eq(profileRoomPermission.roomId, roomId),
					inArray(profileRoomPermission.profileId, toRemove),
				),
			);
	}
}

async function syncRoomUsers(roomId: string, nextIds: string[]) {
	const current = await db
		.select({ userId: userRoomPermission.userId })
		.from(userRoomPermission)
		.where(eq(userRoomPermission.roomId, roomId));

	const currentSet = new Set(current.map((r) => r.userId));
	const nextSet = new Set(nextIds);

	const toAdd = nextIds.filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

	if (toAdd.length > 0) {
		await db
			.insert(userRoomPermission)
			.values(toAdd.map((userId) => ({ id: uuidv7(), userId, roomId })))
			.onConflictDoNothing();
	}

	if (toRemove.length > 0) {
		await db
			.delete(userRoomPermission)
			.where(
				and(
					eq(userRoomPermission.roomId, roomId),
					inArray(userRoomPermission.userId, toRemove),
				),
			);
	}
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function updateRoom({
	id,
	name,
	blockId,
	typeId,
	requiresBiometry,
	requiresRFID,
	profileIds,
	userIds,
}: UpdateRoomInput) {
	const updates: Partial<{
		name: string;
		blockId: string;
		typeId: string;
		requiresBiometry: boolean;
		requiresRFID: boolean;
	}> = {};

	if (name !== undefined) updates.name = name;
	if (blockId !== undefined) updates.blockId = blockId;
	if (typeId !== undefined) updates.typeId = typeId;
	if (requiresBiometry !== undefined)
		updates.requiresBiometry = requiresBiometry;
	if (requiresRFID !== undefined) updates.requiresRFID = requiresRFID;

	if (Object.keys(updates).length > 0) {
		await db.update(room).set(updates).where(eq(room.id, id));
	}

	if (profileIds !== undefined) {
		await syncRoomProfiles(id, profileIds);
	}

	if (userIds !== undefined) {
		await syncRoomUsers(id, userIds);
	}

	const rows = await db.select().from(room).where(eq(room.id, id));

	if (!rows[0]) throw new Error("Sala não encontrada");

	return rows[0];
}
