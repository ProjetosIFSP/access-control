import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { userProfile } from "@/db/schema/profile";

export interface GetUsersFilters {
	q?: string;
	/** Filter by profile ID(s) — returns users that belong to ANY of the given profiles */
	profileIds?: string[];
}

export async function getUsers(qOrFilters?: string | GetUsersFilters) {
	// Accept old signature (string) or new filters object
	const filters: GetUsersFilters =
		typeof qOrFilters === "string" ? { q: qOrFilters } : (qOrFilters ?? {});

	const { q, profileIds } = filters;

	let baseQuery = db
		.selectDistinct({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			isAdmin: user.isAdmin,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			hasCredentials: sql<boolean> /* sql */`EXISTS (
        SELECT 1 FROM ${accessCredential}
        WHERE ${accessCredential.userId} = ${user.id}
      )`.as("hasCredentials"),
		})
		.from(user)
		.$dynamic();

	const conditions = [];

	if (q?.trim()) {
		const pattern = `%${q.trim()}%`;
		conditions.push(or(ilike(user.name, pattern), ilike(user.email, pattern)));
	}

	if (profileIds && profileIds.length > 0) {
		// Join with userProfile to filter by profile membership
		// biome-ignore lint/suspicious/noExplicitAny: drizzle typings restrictions
		baseQuery = (baseQuery as any)
			.innerJoin(userProfile, eq(userProfile.userId, user.id))
			.$dynamic();
		conditions.push(inArray(userProfile.profileId, profileIds));
	}

	if (conditions.length > 0) {
		// biome-ignore lint/suspicious/noExplicitAny: drizzle typings
		baseQuery = baseQuery.where(and(...(conditions as [any, ...any[]])));
	}

	const result = await baseQuery.orderBy(user.name);

	return { result };
}
