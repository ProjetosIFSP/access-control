import { db } from "@/db";
import { userRoomPermission } from "@/db/schema/access";
import { eq, and } from "drizzle-orm";

export const removeUserRoomPermission = async (userId: string, roomId: string) => {
  await db.delete(userRoomPermission).where(and(eq(userRoomPermission.userId, userId), eq(userRoomPermission.roomId, roomId)));
  return { ok: true } as const;
};
