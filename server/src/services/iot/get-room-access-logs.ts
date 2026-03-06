import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accessLog } from "@/db/schema/access";
import { user } from "@/db/schema/auth";

export interface RoomAccessLogEntry {
	id: string;
	status: string;
	reason: string | null;
	timestamp: Date;
	userId: string | null;
	userName: string | null;
	userEmail: string | null;
}

export interface RoomAccessLogOptions {
	limit?: number;
}

export async function getRoomAccessLogs(
	roomId: string,
	options: RoomAccessLogOptions = {},
): Promise<RoomAccessLogEntry[]> {
	const limit = options.limit ?? 10;

	const logs = await db
		.select({
			id: accessLog.id,
			status: accessLog.status,
			reason: accessLog.reason,
			timestamp: accessLog.timestamp,
			userId: accessLog.userId,
			userName: user.name,
			userEmail: user.email,
		})
		.from(accessLog)
		.leftJoin(user, eq(user.id, accessLog.userId))
		.where(eq(accessLog.roomId, roomId))
		.orderBy(desc(accessLog.timestamp))
		.limit(limit);

	return logs;
}
