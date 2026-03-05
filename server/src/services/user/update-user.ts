import { and, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { db } from "@/db";
import { userRoomPermission, userRoomTypePermission } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { userProfile } from "@/db/schema/profile";

interface UpdateUserInput {
	id: string;
	name?: string;
	email?: string;
	isAdmin?: boolean;
	profileIds?: string[];
	roomIds?: string[];
	roomTypeIds?: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function syncUserProfiles(userId: string, nextIds: string[]) {
	const current = await db
		.select({ profileId: userProfile.profileId })
		.from(userProfile)
		.where(eq(userProfile.userId, userId));

	const currentSet = new Set(current.map((r) => r.profileId));
	const nextSet = new Set(nextIds);

	const toAdd = nextIds.filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

	if (toAdd.length > 0) {
		await db
			.insert(userProfile)
			.values(toAdd.map((profileId) => ({ userId, profileId })))
			.onConflictDoNothing();
	}

	if (toRemove.length > 0) {
		await db
			.delete(userProfile)
			.where(
				and(
					eq(userProfile.userId, userId),
					inArray(userProfile.profileId, toRemove),
				),
			);
	}
}

async function syncUserRoomPermissions(userId: string, nextIds: string[]) {
	const current = await db
		.select({ roomId: userRoomPermission.roomId })
		.from(userRoomPermission)
		.where(eq(userRoomPermission.userId, userId));

	const currentSet = new Set(current.map((r) => r.roomId));
	const nextSet = new Set(nextIds);

	const toAdd = nextIds.filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

	if (toAdd.length > 0) {
		await db
			.insert(userRoomPermission)
			.values(toAdd.map((roomId) => ({ id: uuidv7(), userId, roomId })))
			.onConflictDoNothing();
	}

	if (toRemove.length > 0) {
		await db
			.delete(userRoomPermission)
			.where(
				and(
					eq(userRoomPermission.userId, userId),
					inArray(userRoomPermission.roomId, toRemove),
				),
			);
	}
}

async function syncUserRoomTypePermissions(userId: string, nextIds: string[]) {
	const current = await db
		.select({ roomTypeId: userRoomTypePermission.roomTypeId })
		.from(userRoomTypePermission)
		.where(eq(userRoomTypePermission.userId, userId));

	const currentSet = new Set(current.map((r) => r.roomTypeId));
	const nextSet = new Set(nextIds);

	const toAdd = nextIds.filter((id) => !currentSet.has(id));
	const toRemove = [...currentSet].filter((id) => !nextSet.has(id));

	if (toAdd.length > 0) {
		await db
			.insert(userRoomTypePermission)
			.values(toAdd.map((roomTypeId) => ({ id: uuidv7(), userId, roomTypeId })))
			.onConflictDoNothing();
	}

	if (toRemove.length > 0) {
		await db
			.delete(userRoomTypePermission)
			.where(
				and(
					eq(userRoomTypePermission.userId, userId),
					inArray(userRoomTypePermission.roomTypeId, toRemove),
				),
			);
	}
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function updateUser({
	id,
	name,
	email,
	isAdmin,
	profileIds,
	roomIds,
	roomTypeIds,
}: UpdateUserInput) {
	const updates: Partial<{ name: string; email: string; isAdmin: boolean }> =
		{};
	if (name !== undefined) updates.name = name;
	if (email !== undefined) updates.email = email;
	if (isAdmin !== undefined) updates.isAdmin = isAdmin;

	if (Object.keys(updates).length > 0) {
		await db.update(user).set(updates).where(eq(user.id, id));
	}

	// Sync relational data when the caller explicitly provides the arrays
	if (profileIds !== undefined) {
		await syncUserProfiles(id, profileIds);
	}

	if (roomIds !== undefined) {
		await syncUserRoomPermissions(id, roomIds);
	}

	if (roomTypeIds !== undefined) {
		await syncUserRoomTypePermissions(id, roomTypeIds);
	}

	const [updated] = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			isAdmin: user.isAdmin,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		})
		.from(user)
		.where(eq(user.id, id));

	if (!updated) throw new Error("Usuário não encontrado");

	return updated;
}
