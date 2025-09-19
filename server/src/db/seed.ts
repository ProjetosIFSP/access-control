import argon2 from "argon2";
import "dotenv/config";
import { client, db } from ".";
import { user } from "./schema";

async function seed() {
	await db.delete(user);

	const passwordHash = await argon2.hash("123", {
		type: argon2.argon2id,
		timeCost: 3,
		memoryCost: 1 << 12,
		parallelism: 1,
	});

	const usersResult = await db.insert(user).values([
		{
			email: "abner.silva@aluno.ifsp.edu.br",
			name: "Abner Silva",
			password: passwordHash,
			isAdmin: false,
		},
		{
			email: "user2@example.com",
			name: "User Two",
			password: passwordHash,
			isAdmin: true,
		},
	]);

	console.log("Users seeded:", usersResult);
}

seed().finally(() => {
	client.end();
});
