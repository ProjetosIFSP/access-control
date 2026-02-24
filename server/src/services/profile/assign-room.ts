import { db } from "@/db";
import { profileRoomPermission } from "@/db/schema/profile";
import { v7 as uuidv7 } from "uuid";

export const assignProfileToRoom = async (profileId: string, roomId: string) => {
  const id = uuidv7();
  await db.insert(profileRoomPermission).values({ id, profileId, roomId }).onConflictDoNothing();
  return { ok: true } as const;
};
