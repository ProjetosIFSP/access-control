import { db } from "@/db";
import { doorCommand } from "@/db/schema/door";
import { desc, eq } from "drizzle-orm";

export interface ControllerCommandListOptions {
	limit?: number;
}

export async function getControllerCommands(
	controllerId: string,
	options: ControllerCommandListOptions = {},
) {
	const limit = options.limit ?? 20;

	const commands = await db
		.select({
			id: doorCommand.id,
			type: doorCommand.type,
			status: doorCommand.status,
			payload: doorCommand.payload,
			resultPayload: doorCommand.resultPayload,
			errorMessage: doorCommand.errorMessage,
			expiresAt: doorCommand.expiresAt,
			sentAt: doorCommand.sentAt,
			processedAt: doorCommand.processedAt,
			createdAt: doorCommand.createdAt,
			updatedAt: doorCommand.updatedAt,
		})
		.from(doorCommand)
		.where(eq(doorCommand.controllerId, controllerId))
		.orderBy(desc(doorCommand.createdAt))
		.limit(limit);

	return { commands };
}
