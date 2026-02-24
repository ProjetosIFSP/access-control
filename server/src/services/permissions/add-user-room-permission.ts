import { db } from "@/db";
import { userRoomPermission } from "@/db/schema/access";
import { v7 as uuidv7 } from "uuid";

export const addUserRoomPermission = async (userId: string, roomId: string, expiresAt?: Date) => {
  const id = uuidv7();
  await db.insert(userRoomPermission).values({ id, userId, roomId, expiresAt }).onConflictDoNothing();
  return { id };
};
