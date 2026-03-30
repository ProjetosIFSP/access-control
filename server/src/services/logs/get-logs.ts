import { and, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential, accessLog } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { block, doorController, room } from "@/db/schema/room";

interface GetLogsParams {
	q?: string;
	roomId?: string;
	userId?: string;
	status?: "GRANTED" | "DENIED";
	from?: string;
	to?: string;
	page: number;
	pageSize: number;
}

export async function getLogs({
	q,
	roomId,
	userId,
	status,
	from,
	to,
	page,
	pageSize,
}: GetLogsParams) {
	const conditions = [];

	if (q) {
		const searchPattern = `%${q}%`;
		conditions.push(
			or(
				ilike(user.name, searchPattern),
				ilike(user.email, searchPattern),
				ilike(room.name, searchPattern),
			),
		);
	}

	if (roomId) {
		conditions.push(eq(accessLog.roomId, roomId));
	}

	if (userId) {
		conditions.push(eq(accessLog.userId, userId));
	}

	if (status) {
		conditions.push(eq(accessLog.status, status));
	}

	if (from) {
		conditions.push(gte(accessLog.timestamp, new Date(from)));
	}

	if (to) {
		conditions.push(lte(accessLog.timestamp, new Date(to)));
	}

	const offset = (page - 1) * pageSize;
	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const result = await db
		.select({
			id: accessLog.id,
			timestamp: accessLog.timestamp,
			status: accessLog.status,
			reason: accessLog.reason,
			credentialValueUsed: accessLog.credentialValueUsed,
			credentialType: accessCredential.type,
			roomName: room.name,
			blockName: block.name,
			roomId: accessLog.roomId,
			userId: accessLog.userId,
			userName: user.name,
			userEmail: user.email,
			controllerId: doorController.id,
		})
		.from(accessLog)
		.innerJoin(room, eq(accessLog.roomId, room.id))
		.innerJoin(block, eq(room.blockId, block.id))
		.leftJoin(user, eq(accessLog.userId, user.id))
		.leftJoin(
			accessCredential,
			eq(accessLog.accessCredentialId, accessCredential.id),
		)
		.leftJoin(doorController, eq(accessLog.roomId, doorController.roomId))
		.where(whereClause)
		.orderBy(desc(accessLog.timestamp))
		.limit(pageSize)
		.offset(offset);

	const [counter] = await db
		.select({ value: count() })
		.from(accessLog)
		.innerJoin(room, eq(accessLog.roomId, room.id))
		.leftJoin(user, eq(accessLog.userId, user.id))
		.leftJoin(
			accessCredential,
			eq(accessLog.accessCredentialId, accessCredential.id),
		)
		.where(whereClause);

	return {
		items: result,
		total: Number(counter.value),
		page,
		pageSize,
		totalPages: Math.ceil(Number(counter.value) / pageSize),
	};
}
