import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userRoomPermission, userRoomTypePermission } from "@/db/schema/access";
import {
	profileRoomPermission,
	profileRoomTypePermission,
	userProfile,
} from "@/db/schema/profile";

const DENY_REASONS = {
	NO_PERMISSION: "NO_PERMISSION",
	EXPIRED_PERMISSION: "EXPIRED_PERMISSION",
} as const;

const GRANT_REASONS = {
	ADMIN_OVERRIDE: "ADMIN_OVERRIDE",
	DIRECT_USER_ROOM: "DIRECT_USER_ROOM",
	DIRECT_USER_ROOM_TYPE: "DIRECT_USER_ROOM_TYPE",
	PROFILE_ROOM: "PROFILE_ROOM",
	PROFILE_ROOM_TYPE: "PROFILE_ROOM_TYPE",
} as const;

export interface PermissionCheckResult {
	granted: boolean;
	reason: string;
}

/**
 * Verifica se um usuário tem permissão para acessar uma sala específica,
 * checando os 4 níveis de permissão na ordem de prioridade:
 *
 * 1. Permissão direta de sala (user_room_permission)
 * 2. Permissão por tipo de sala (user_room_type_permission)
 * 3. Permissão via perfil — sala (profile_room_permission)
 * 4. Permissão via perfil — tipo de sala (profile_room_type_permission)
 *
 * Cada nível também verifica expiração.
 */
export async function checkUserRoomAccess(
	userId: string,
	roomId: string,
	roomTypeId: string,
): Promise<PermissionCheckResult> {
	const now = new Date();

	// 1. Permissão direta de sala
	const [directRoom] = await db
		.select({
			id: userRoomPermission.id,
			expiresAt: userRoomPermission.expiresAt,
		})
		.from(userRoomPermission)
		.where(
			and(
				eq(userRoomPermission.userId, userId),
				eq(userRoomPermission.roomId, roomId),
			),
		)
		.limit(1);

	if (directRoom) {
		if (
			directRoom.expiresAt &&
			directRoom.expiresAt.getTime() < now.getTime()
		) {
			return { granted: false, reason: DENY_REASONS.EXPIRED_PERMISSION };
		}
		return { granted: true, reason: GRANT_REASONS.DIRECT_USER_ROOM };
	}

	// 2. Permissão por tipo de sala
	const [directRoomType] = await db
		.select({
			id: userRoomTypePermission.id,
			expiresAt: userRoomTypePermission.expiresAt,
		})
		.from(userRoomTypePermission)
		.where(
			and(
				eq(userRoomTypePermission.userId, userId),
				eq(userRoomTypePermission.roomTypeId, roomTypeId),
			),
		)
		.limit(1);

	if (directRoomType) {
		if (
			directRoomType.expiresAt &&
			directRoomType.expiresAt.getTime() < now.getTime()
		) {
			return { granted: false, reason: DENY_REASONS.EXPIRED_PERMISSION };
		}
		return { granted: true, reason: GRANT_REASONS.DIRECT_USER_ROOM_TYPE };
	}

	// 3 & 4. Permissões via perfis do usuário
	const profiles = await db
		.select({ profileId: userProfile.profileId })
		.from(userProfile)
		.where(eq(userProfile.userId, userId));

	for (const p of profiles) {
		// 3. Perfil → sala específica
		const [profileRoom] = await db
			.select({
				id: profileRoomPermission.id,
				expiresAt: profileRoomPermission.expiresAt,
			})
			.from(profileRoomPermission)
			.where(
				and(
					eq(profileRoomPermission.profileId, p.profileId),
					eq(profileRoomPermission.roomId, roomId),
				),
			)
			.limit(1);

		if (profileRoom) {
			if (
				profileRoom.expiresAt &&
				profileRoom.expiresAt.getTime() < now.getTime()
			) {
				continue; // permissão expirada neste perfil, tentar o próximo
			}
			return { granted: true, reason: GRANT_REASONS.PROFILE_ROOM };
		}

		// 4. Perfil → tipo de sala
		const [profileRoomType] = await db
			.select({
				id: profileRoomTypePermission.id,
				expiresAt: profileRoomTypePermission.expiresAt,
			})
			.from(profileRoomTypePermission)
			.where(
				and(
					eq(profileRoomTypePermission.profileId, p.profileId),
					eq(profileRoomTypePermission.roomTypeId, roomTypeId),
				),
			)
			.limit(1);

		if (profileRoomType) {
			if (
				profileRoomType.expiresAt &&
				profileRoomType.expiresAt.getTime() < now.getTime()
			) {
				continue;
			}
			return { granted: true, reason: GRANT_REASONS.PROFILE_ROOM_TYPE };
		}
	}

	return { granted: false, reason: DENY_REASONS.NO_PERMISSION };
}
