import { eq, ilike, or } from "drizzle-orm";
import { db, client } from "@/db";
import { block, room, roomType } from "@/db/schema/room";

export type RoomState = "aberta" | "fechada" | "alerta";

export interface UserInfo {
	id: string;
	name: string;
	email: string;
}

export interface RoomSummaryItem {
	id: string;
	name: string;
	typeAbbreviation: string;
	state: RoomState;
	lastStatusUpdateAt: string | null;
	currentUser?: UserInfo | null;
	lastUser?: UserInfo | null;
}

export interface BlockWithRooms {
	block: { id: string; name: string };
	rooms: RoomSummaryItem[];
}

function mapDoorState(
	doorState: string,
	isLocked: boolean | null,
): RoomState {
	if (doorState === "OPEN") {
		return isLocked ? "alerta" : "aberta";
	}
	if (doorState === "CLOSED") {
		return "fechada";
	}
	// UNKNOWN
	return "alerta";
}

export async function getRoomsSummary(
	authenticated: boolean,
	search?: string,
): Promise<{ result: BlockWithRooms[] }> {
	const term = search?.trim();
	const whereClause = term
		? or(ilike(room.name, `%${term}%`), ilike(block.name, `%${term}%`))
		: undefined;

	// Fetch all rooms joined with block and roomType
	const rows = await db
		.select({
			roomId: room.id,
			roomName: room.name,
			roomBlockId: room.blockId,
			doorState: room.doorState,
			isLocked: room.isLocked,
			lastStatusUpdateAt: room.lastStatusUpdateAt,
			blockId: block.id,
			blockName: block.name,
			typeAbbreviation: roomType.abbreviation,
		})
		.from(room)
		.innerJoin(block, eq(block.id, room.blockId))
		.innerJoin(roomType, eq(roomType.id, room.typeId))
		.where(whereClause)
		.orderBy(block.name, room.name);

	// If authenticated, fetch last GRANTED access per room (one query, DISTINCT ON)
	type LastAccessRow = {
		room_id: string;
		user_id: string | null;
		user_name: string | null;
		user_email: string | null;
	};

	let lastAccessMap = new Map<string, UserInfo>();

	if (authenticated) {
		const lastAccess = await client<LastAccessRow[]>`
			SELECT DISTINCT ON (al.room_id)
				al.room_id,
				al.user_id,
				u.name  AS user_name,
				u.email AS user_email
			FROM access_log al
			LEFT JOIN "user" u ON u.id = al.user_id
			WHERE al.status = 'GRANTED'
			  AND al.user_id IS NOT NULL
			ORDER BY al.room_id, al.timestamp DESC
		`;

		for (const row of lastAccess) {
			if (row.user_id && row.user_name && row.user_email) {
				lastAccessMap.set(row.room_id, {
					id: row.user_id,
					name: row.user_name,
					email: row.user_email,
				});
			}
		}
	}

	// Group rooms by block
	const blocksMap = new Map<
		string,
		{ block: { id: string; name: string }; rooms: RoomSummaryItem[] }
	>();

	for (const row of rows) {
		if (!blocksMap.has(row.blockId)) {
			blocksMap.set(row.blockId, {
				block: { id: row.blockId, name: row.blockName },
				rooms: [],
			});
		}

		const state = mapDoorState(row.doorState, row.isLocked);
		const lastUser = authenticated
			? (lastAccessMap.get(row.roomId) ?? null)
			: undefined;
		// "currentUser" is meaningful only when the door is currently open
		const currentUser = authenticated
			? row.doorState === "OPEN"
				? (lastAccessMap.get(row.roomId) ?? null)
				: null
			: undefined;

		const roomItem: RoomSummaryItem = {
			id: row.roomId,
			name: row.roomName,
			typeAbbreviation: row.typeAbbreviation,
			state,
			lastStatusUpdateAt: row.lastStatusUpdateAt?.toISOString() ?? null,
			...(authenticated ? { currentUser, lastUser } : {}),
		};

		blocksMap.get(row.blockId)!.rooms.push(roomItem);
	}

	return { result: Array.from(blocksMap.values()) };
}
