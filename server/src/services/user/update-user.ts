import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth";

interface UpdateUserInput {
	id: string;
	name?: string;
	email?: string;
	isAdmin?: boolean;
}

export async function updateUser({ id, name, email, isAdmin }: UpdateUserInput) {
	const updates: Partial<{ name: string; email: string; isAdmin: boolean }> = {};
	if (name !== undefined) updates.name = name;
	if (email !== undefined) updates.email = email;
	if (isAdmin !== undefined) updates.isAdmin = isAdmin;

	const [updated] = await db
		.update(user)
		.set(updates)
		.where(eq(user.id, id))
		.returning({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			isAdmin: user.isAdmin,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		});

	if (!updated) throw new Error("Usuário não encontrado");

	return updated;
}
