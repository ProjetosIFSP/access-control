import z from "@/lib/zod";

const envSchema = z.object({
	DATABASE_URL: z.url(),
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_SECRET_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
