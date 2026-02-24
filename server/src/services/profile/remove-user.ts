import { db } from "@/db";
import { userProfile } from "@/db/schema/profile";

export const removeUserFromProfile = async (userId: string, profileId: string) => {
  await db.delete(userProfile).where(userProfile.userId.eq(userId).and(userProfile.profileId.eq(profileId))).run();
  return { ok: true } as const;
};
