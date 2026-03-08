import { and, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { profile, userProfile } from "@/db/schema/profile";

export interface GetUsersFilters {
	q?: string;
	/** Filter by profile ID(s) — returns users that belong to ANY of the given profiles */
	profileIds?: string[];
	page?: number;
	pageSize?: number;
}

export async function getUsers(qOrFilters?: string | GetUsersFilters) {
	// Accept old signature (string) or new filters object
	const filters: GetUsersFilters =
		typeof qOrFilters === "string" ? { q: qOrFilters } : (qOrFilters ?? {});

	const { q, profileIds, page = 1, pageSize = 20 } = filters;

	const offset = (page - 1) * pageSize;

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
			fingerprintCount: sql<string> /* sql */`(
	        SELECT COUNT(*) FROM ${accessCredential}
	        WHERE ${accessCredential.userId} = ${user.id}
	          AND ${accessCredential.type} = 'FINGERPRINT'
	      )`.as("fingerprintCount"),
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

	// ── Count total (before pagination) ───────────────────────────────────────

	// Build a count query that mirrors the same joins/conditions
	let countQuery = db
		.selectDistinct({ id: user.id })
		.from(user)
		.$dynamic();

	if (profileIds && profileIds.length > 0) {
		// biome-ignore lint/suspicious/noExplicitAny: drizzle typings restrictions
		countQuery = (countQuery as any)
			.innerJoin(userProfile, eq(userProfile.userId, user.id))
			.$dynamic();
	}

	if (conditions.length > 0) {
		// biome-ignore lint/suspicious/noExplicitAny: drizzle typings
		countQuery = countQuery.where(and(...(conditions as [any, ...any[]])));
	}

	const countResult = await db
		.select({ total: count() })
		.from(countQuery.as("subquery"));

	const total = Number(countResult[0]?.total ?? 0);

	// ── Paginated rows ────────────────────────────────────────────────────────

	const rows = await baseQuery
		.orderBy(user.name)
		.limit(pageSize)
		.offset(offset);

	// Fetch profiles for all returned users in a single query
	const userIds = rows.map((u) => u.id);

	const profileRows =
		userIds.length > 0
			? await db
					.select({
						userId: userProfile.userId,
						profileId: profile.id,
						profileName: profile.name,
					})
					.from(userProfile)
					.innerJoin(profile, eq(userProfile.profileId, profile.id))
					.where(inArray(userProfile.userId, userIds))
			: [];

	// Group profiles by userId
	const profilesByUserId = new Map<string, { id: string; name: string }[]>();
	for (const row of profileRows) {
		const existing = profilesByUserId.get(row.userId) ?? [];
		existing.push({ id: row.profileId, name: row.profileName });
		profilesByUserId.set(row.userId, existing);
	}

	const result = rows.map((u) => ({
		...u,
		fingerprintCount: Number.parseInt(u.fingerprintCount as string, 10),
		profiles: profilesByUserId.get(u.id) ?? [],
	}));

	return {
		result,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize),
	};
}
