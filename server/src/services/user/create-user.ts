import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { account } from "@/db/schema/auth";
import { userProfile } from "@/db/schema/profile";
import { userRoomPermission, userRoomTypePermission } from "@/db/schema/access";
import { v7 as uuidv7 } from "uuid";
import { scrypt, randomBytes } from "node:crypto";

interface CreateUserInput {
	name: string;
	email: string;
	isAdmin: boolean;
	password?: string;
	profileIds?: string[];
	roomIds?: string[];
	roomTypeIds?: string[];
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

export async function createUser({
	name,
	email,
	isAdmin,
	password,
	profileIds = [],
	roomIds = [],
	roomTypeIds = [],
}: CreateUserInput) {
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

	// Assign profiles
	if (profileIds.length > 0) {
		await db
			.insert(userProfile)
			.values(profileIds.map((profileId) => ({ userId, profileId })))
			.onConflictDoNothing();
	}

	// Assign direct room permissions
	if (roomIds.length > 0) {
		await db
			.insert(userRoomPermission)
			.values(roomIds.map((roomId) => ({ id: uuidv7(), userId, roomId })))
			.onConflictDoNothing();
	}

	// Assign room-type permissions
	if (roomTypeIds.length > 0) {
		await db
			.insert(userRoomTypePermission)
			.values(
				roomTypeIds.map((roomTypeId) => ({ id: uuidv7(), userId, roomTypeId })),
			)
			.onConflictDoNothing();
	}

	return newUser;
}
