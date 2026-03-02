import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth";

export async function deleteUser(id: string) {
	const [deleted] = await db
		.delete(user)
		.where(eq(user.id, id))
		.returning({ id: user.id });

	if (!deleted) throw new Error("Usuário não encontrado");

	return deleted;
}
