import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accessCredential } from "@/db/schema/access";
import { user } from "@/db/schema/auth";

export async function getUsers() {
	const result = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			isAdmin: user.isAdmin,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			hasCredentials:
				sql<boolean> /* sql */`${accessCredential.id} IS NOT NULL`.as(
					"hasCredentials",
				),
		})
		.from(user)
		.leftJoin(accessCredential, eq(accessCredential.userId, user.id))
		.groupBy(user.id)
		.orderBy(user.name);

	return { result };
}
