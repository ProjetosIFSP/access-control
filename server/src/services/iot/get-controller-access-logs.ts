import { db } from "@/db";
import { accessLog } from "@/db/schema/access";
import { user } from "@/db/schema/auth";
import { doorController } from "@/db/schema/door";
import { desc, eq } from "drizzle-orm";

export interface ControllerAccessLogOptions {
	limit?: number;
}

export async function getControllerAccessLogs(
	controllerId: string,
	options: ControllerAccessLogOptions = {},
) {
	const [controller] = await db
		.select({ roomId: doorController.roomId })
		.from(doorController)
		.where(eq(doorController.id, controllerId))
		.limit(1);

	if (!controller) {
		return null;
	}

	const limit = options.limit ?? 50;

	const logs = await db
		.select({
			id: accessLog.id,
			status: accessLog.status,
			reason: accessLog.reason,
			timestamp: accessLog.timestamp,
			userId: accessLog.userId,
			credentialId: accessLog.accessCredentialId,
			credentialValueUsed: accessLog.credentialValueUsed,
			userName: user.name,
		})
		.from(accessLog)
		.leftJoin(user, eq(user.id, accessLog.userId))
		.where(eq(accessLog.roomId, controller.roomId))
		.orderBy(desc(accessLog.timestamp))
		.limit(limit);

	return {
		roomId: controller.roomId,
		logs,
	};
}
