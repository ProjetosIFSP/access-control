import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { block, room } from "@/db/schema/room";

export interface GetRoomsFilters {
	q?: string;
	typeIds?: string[];
	blockIds?: string[];
}

export async function getRooms(filters?: GetRoomsFilters) {
	const { q, typeIds, blockIds } = filters ?? {};

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

	const query = db
		.select()
		.from(room)
		.innerJoin(block, eq(block.id, room.blockId))
		.orderBy(block.name, room.name);

	if (conditions.length > 0) {
		// biome-ignore lint/suspicious/noExplicitAny: drizzle typings
		query.where(and(...(conditions as [any, ...any[]])));
	}

	const result = await query;
	return { result };
}
