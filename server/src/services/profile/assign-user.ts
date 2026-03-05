import { db } from "@/db";
import { userProfile } from "@/db/schema/profile";

export const assignUserToProfile = async (
	userId: string,
	profileId: string,
) => {
	await db
		.insert(userProfile)
		.values({ userId, profileId })
		.onConflictDoNothing();
	return { ok: true } as const;
};
