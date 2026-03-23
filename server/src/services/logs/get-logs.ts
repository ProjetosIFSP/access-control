import { desc, eq, and, count } from "drizzle-orm";
import { db } from "@/db";
import { accessLog } from "@/db/schema/access";
import { room, block } from "@/db/schema/room";
import { user } from "@/db/schema/auth";

interface GetLogsParams {
  roomId?: string;
  userId?: string;
  status?: "GRANTED" | "DENIED";
  page: number;
  pageSize: number;
}

export async function getLogs({ roomId, userId, status, page, pageSize }: GetLogsParams) {
  const conditions = [];
  
  if (roomId) {
    conditions.push(eq(accessLog.roomId, roomId));
  }
  
  if (userId) {
    conditions.push(eq(accessLog.userId, userId));
  }
  
  if (status) {
    conditions.push(eq(accessLog.status, status));
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
      roomName: room.name,
      blockName: block.name,
      roomId: accessLog.roomId,
      userId: accessLog.userId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(accessLog)
    .innerJoin(room, eq(accessLog.roomId, room.id))
    .innerJoin(block, eq(room.blockId, block.id))
    .leftJoin(user, eq(accessLog.userId, user.id))
    .where(whereClause)
    .orderBy(desc(accessLog.timestamp))
    .limit(pageSize)
    .offset(offset);

  const [counter] = await db
    .select({ value: count() })
    .from(accessLog)
    .innerJoin(room, eq(accessLog.roomId, room.id))
    .leftJoin(user, eq(accessLog.userId, user.id))
    .where(whereClause);

  return {
    items: result,
    total: Number(counter.value),
    page,
    pageSize,
    totalPages: Math.ceil(Number(counter.value) / pageSize),
  };
}
