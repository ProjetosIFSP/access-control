import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
	accessCredential,
	userRoomPermission,
	userRoomTypePermission,
} from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import {
	profileRoomPermission,
	profileRoomTypePermission,
	userProfile,
} from "@/db/schema/profile";
import { doorController, room } from "@/db/schema/room";

interface SyncCredential {
	credentialId: string;
	template: string;
}

/**
 * Returns up to `limit` FINGERPRINT credentials for users who have access to
 * the room assigned to the given controller.
 * Used for bulk-syncing templates to the physical sensor.
 */
export async function getAuthorizedFingerprintsForController(
	controllerId: string,
	limit = 49,
): Promise<SyncCredential[]> {
	// 1. Find the controller's room
	const [ctrl] = await db
		.select({ roomId: doorController.roomId })
		.from(doorController)
		.where(eq(doorController.id, controllerId));

	if (!ctrl?.roomId) return [];

	// 2. Get room details (for typeId)
	const [rm] = await db
		.select({ id: room.id, typeId: room.typeId })
		.from(room)
		.where(eq(room.id, ctrl.roomId));

	if (!rm) return [];

	const now = new Date();
	const notExpired = or(isNull(userRoomPermission.expiresAt), gt(userRoomPermission.expiresAt, now));
	const notExpiredType = or(isNull(userRoomTypePermission.expiresAt), gt(userRoomTypePermission.expiresAt, now));

	// 3. Collect all user IDs with permission (direct room, direct room type, profile room, profile room type, or admin)
	const authorizedUserIds = new Set<string>();

	// 3a. Direct room permission
	const directRoom = await db
		.select({ userId: userRoomPermission.userId })
		.from(userRoomPermission)
		.where(and(eq(userRoomPermission.roomId, rm.id), notExpired));
	for (const r of directRoom) authorizedUserIds.add(r.userId);

	// 3b. Direct room type permission
	const directType = await db
		.select({ userId: userRoomTypePermission.userId })
		.from(userRoomTypePermission)
		.where(and(eq(userRoomTypePermission.roomTypeId, rm.typeId), notExpiredType));
	for (const r of directType) authorizedUserIds.add(r.userId);

	// 3c. Profile-based permissions
	const profileRooms = await db
		.select({ profileId: profileRoomPermission.profileId })
		.from(profileRoomPermission)
		.where(eq(profileRoomPermission.roomId, rm.id));

	const profileTypes = await db
		.select({ profileId: profileRoomTypePermission.profileId })
		.from(profileRoomTypePermission)
		.where(eq(profileRoomTypePermission.roomTypeId, rm.typeId));

	const profileIds = new Set<string>();
	for (const r of profileRooms) profileIds.add(r.profileId);
	for (const r of profileTypes) profileIds.add(r.profileId);

	if (profileIds.size > 0) {
		for (const pid of profileIds) {
			const profileUsers = await db
				.select({ userId: userProfile.userId })
				.from(userProfile)
				.where(eq(userProfile.profileId, pid));
			for (const u of profileUsers) authorizedUserIds.add(u.userId);
		}
	}

	// 3d. Admins always have access
	const admins = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.isAdmin, true));
	for (const a of admins) authorizedUserIds.add(a.id);

	if (authorizedUserIds.size === 0) return [];

	// 4. Get all active FINGERPRINT credentials for these users
	const userIdArray = Array.from(authorizedUserIds);
	const credentials: SyncCredential[] = [];

	for (const uid of userIdArray) {
		if (credentials.length >= limit) break;

		const userCreds = await db
			.select({
				id: accessCredential.id,
				template: accessCredential.template,
			})
			.from(accessCredential)
			.where(
				and(
					eq(accessCredential.userId, uid),
					eq(accessCredential.type, "FINGERPRINT"),
					eq(accessCredential.isActive, true),
				),
			);

		for (const c of userCreds) {
			if (credentials.length >= limit) break;
			// Skip if template is somehow missing (e.g. legacy or invalid records)
			if (!c.template) continue;
			credentials.push({ credentialId: c.id, template: c.template });
		}
	}

	return credentials;
}
