import { and, count, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { doorController } from "@/db/schema/door";
import { block, room, roomType } from "@/db/schema/room";

export interface GetRoomsFilters {
	q?: string;
	typeIds?: string[];
	blockIds?: string[];
	page?: number;
	pageSize?: number;
}

export async function getRooms(filters?: GetRoomsFilters) {
	const { q, typeIds, blockIds, page = 1, pageSize = 20 } = filters ?? {};

	const offset = (page - 1) * pageSize;

	const conditions = [];

	if (q?.trim()) {
		const pattern = `%${q.trim()}%`;
		conditions.push(ilike(room.name, pattern));
	}

	if (typeIds && typeIds.length > 0) {
		conditions.push(inArray(room.typeId, typeIds));
	}

	if (blockIds && blockIds.length > 0) {
		conditions.push(inArray(room.blockId, blockIds));
	}

	const whereClause =
		conditions.length > 0
			? // biome-ignore lint/suspicious/noExplicitAny: drizzle typings
				and(...(conditions as [any, ...any[]]))
			: undefined;

	// ── Count total (before pagination) ───────────────────────────────────────

	const countResult = await db
		.select({ total: count() })
		.from(room)
		.innerJoin(block, eq(block.id, room.blockId))
		.where(whereClause);

	const total = Number(countResult[0]?.total ?? 0);

	// ── Paginated rows ────────────────────────────────────────────────────────

	const baseQuery = db
		.select()
		.from(room)
		.leftJoin(doorController, eq(doorController.roomId, room.id))
		.innerJoin(block, eq(block.id, room.blockId))
		.innerJoin(roomType, eq(roomType.id, room.typeId));

	const result = await (whereClause
		? baseQuery
				.where(whereClause)
				.orderBy(block.name, room.name)
				.limit(pageSize)
				.offset(offset)
		: baseQuery.orderBy(block.name, room.name).limit(pageSize).offset(offset));

	return {
		result,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	};
}
