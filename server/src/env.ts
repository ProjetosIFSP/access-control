import z from "@/lib/zod";

const envSchema = z.object({
	DATABASE_URL: z.url(),
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_SECRET_KEY: z.string().optional(),
	/** Shared secret included in every IoT device payload for basic authentication */
	IOT_DEVICE_SECRET: z.string().min(8).optional(),
	/**
	 * 6-byte MIFARE Classic sector key expressed as 12 hex chars (e.g. "D3F7D3F7D3F7").
	 * Must match the MIFARE_KEY constant flashed into every NFC terminal firmware.
	 * Defaults to the standard NDEF application key when not set.
	 */
	MIFARE_SECTOR_KEY: z.string().length(12).optional(),
});

export const env = envSchema.parse(process.env);
