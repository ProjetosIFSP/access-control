import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { account } from "@/db/schema/auth";
import { v7 as uuidv7 } from "uuid";
import { scrypt, randomBytes } from "node:crypto";

interface CreateUserInput {
	name: string;
	email: string;
	isAdmin: boolean;
	password?: string;
}

/**
 * Hash a password using scrypt (same algorithm better-auth uses internally).
 */
async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16).toString("hex");
	return new Promise((resolve, reject) => {
		scrypt(password, salt, 64, (err, derivedKey) => {
			if (err) reject(err);
			resolve(`${salt}:${derivedKey.toString("hex")}`);
		});
	});
}

export async function createUser({ name, email, isAdmin, password }: CreateUserInput) {
	const userId = uuidv7();

	const [newUser] = await db
		.insert(user)
		.values({
			id: userId,
			name,
			email,
			isAdmin,
			emailVerified: false,
		})
		.returning({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
			isAdmin: user.isAdmin,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		});

	// If a password was provided, create a credential account
	if (password) {
		const hashedPassword = await hashPassword(password);

		await db.insert(account).values({
			id: uuidv7(),
			accountId: userId,
			providerId: "credential",
			userId,
			password: hashedPassword,
		});
	}

	return newUser;
}
