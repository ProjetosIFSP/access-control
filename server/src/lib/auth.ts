import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as authSchema from "@/db/schema/auth";

export const auth = betterAuth({
	basePath: "/auth",
	trustedOrigins: [
		process.env.BETTER_AUTH_URL || "http://localhost:3000",
		"http://localhost:3000",
		"http://localhost:5173",
	],
	secret: process.env.BETTER_AUTH_SECRET,
	user: {
		additionalFields: {
			isAdmin: {
				type: "boolean",
				defaultValue: false,
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			// TODO: substituir por envio real de e-mail em produção
			console.log(`[ResetPassword] URL para ${user.email}: ${url}`);
		},
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_SECRET_KEY as string,
			mapProfileToUser: (profile) => ({
				emailVerified: true,
				isAdmin: false,
			}),
		},
	},
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: authSchema,
	}),
	databaseHooks: {
		user: {
			create: {
				before: async (user) => ({
					data: { ...user, isAdmin: false },
				}),
			},
		},
	},
	advanced: {
		database: {
			generateId: false,
		},
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},
});
