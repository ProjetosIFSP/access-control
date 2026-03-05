import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfile } from "@/db/schema/profile";

export const removeUserFromProfile = async (
	userId: string,
	profileId: string,
) => {
	await db
		.delete(userProfile)
		.where(
			and(eq(userProfile.userId, userId), eq(userProfile.profileId, profileId)),
		);
	return { ok: true } as const;
};
