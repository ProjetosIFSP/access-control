import { db } from "@/db";
import { userRoomPermission } from "@/db/schema/access";

export const removeUserRoomPermission = async (userId: string, roomId: string) => {
  await db.delete(userRoomPermission).where(userRoomPermission.userId.eq(userId).and(userRoomPermission.roomId.eq(roomId))).run();
  return { ok: true } as const;
};
