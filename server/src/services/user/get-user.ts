import { sql } from "drizzle-orm";
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
			hasCredentials: sql<boolean> /* sql */`EXISTS (
				SELECT 1 FROM ${accessCredential}
				WHERE ${accessCredential.userId} = ${user.id}
			)`.as("hasCredentials"),
		})
		.from(user)
		.orderBy(user.name);

	return { result };
}
