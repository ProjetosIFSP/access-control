import { db } from "@/db";
import { doorCommand, doorController } from "@/db/schema/door";
import { block, room } from "@/db/schema/room";
import { desc, eq, inArray } from "drizzle-orm";

interface DoorControllerRow {
	controllerId: string;
	roomId: string;
	roomName: string;
	blockName: string;
	firmwareVersion: string | null;
	lastSeenAt: Date;
	doorState: typeof room.$inferSelect.doorState;
	isLocked: boolean | null;
	lastStatusUpdateAt: Date | null;
}

interface LastCommandRow {
	controllerId: string;
	id: string;
	type: typeof doorCommand.$inferSelect.type;
	status: typeof doorCommand.$inferSelect.status;
	createdAt: Date;
	sentAt: Date | null;
	processedAt: Date | null;
}

export interface DoorControllerSummary {
	controllerId: string;
	room: {
		id: string;
		name: string;
		blockName: string;
		doorState: typeof room.$inferSelect.doorState;
		isLocked: boolean | null;
		lastStatusUpdateAt: Date | null;
	};
	controller: {
		firmwareVersion: string | null;
		lastSeenAt: Date;
	};
	lastCommand: {
		id: string;
		type: typeof doorCommand.$inferSelect.type;
		status: typeof doorCommand.$inferSelect.status;
		createdAt: Date;
		sentAt: Date | null;
		processedAt: Date | null;
	} | null;
}

export async function getDoorControllers(): Promise<DoorControllerSummary[]> {
	const controllers = await db
		.select({
			controllerId: doorController.id,
			roomId: room.id,
			roomName: room.name,
			blockName: block.name,
			firmwareVersion: doorController.firmwareVersion,
			lastSeenAt: doorController.lastSeenAt,
			doorState: room.doorState,
			isLocked: room.isLocked,
			lastStatusUpdateAt: room.lastStatusUpdateAt,
		})
		.from(doorController)
		.innerJoin(room, eq(room.id, doorController.roomId))
		.innerJoin(block, eq(block.id, room.blockId))
		.orderBy(block.name, room.name);

	if (controllers.length === 0) {
		return [];
	}

	const controllerIds = controllers.map((controller) => controller.controllerId);

	const commandRows: LastCommandRow[] = await db
		.select({
			controllerId: doorCommand.controllerId,
			id: doorCommand.id,
			type: doorCommand.type,
			status: doorCommand.status,
			createdAt: doorCommand.createdAt,
			sentAt: doorCommand.sentAt,
			processedAt: doorCommand.processedAt,
		})
		.from(doorCommand)
		.where(inArray(doorCommand.controllerId, controllerIds))
		.orderBy(desc(doorCommand.createdAt));

	const lastCommandByController = new Map<string, LastCommandRow>();
	for (const command of commandRows) {
		if (!lastCommandByController.has(command.controllerId)) {
			lastCommandByController.set(command.controllerId, command);
		}
	}

	return controllers.map((controller) => {
		const lastCommand = lastCommandByController.get(controller.controllerId);

		return {
			controllerId: controller.controllerId,
			room: {
				id: controller.roomId,
				name: controller.roomName,
				blockName: controller.blockName,
				doorState: controller.doorState,
				isLocked: controller.isLocked,
				lastStatusUpdateAt: controller.lastStatusUpdateAt,
			},
			controller: {
				firmwareVersion: controller.firmwareVersion,
				lastSeenAt: controller.lastSeenAt,
			},
			lastCommand: lastCommand
				? {
					id: lastCommand.id,
					type: lastCommand.type,
					status: lastCommand.status,
					createdAt: lastCommand.createdAt,
					sentAt: lastCommand.sentAt,
					processedAt: lastCommand.processedAt,
				}
				: null,
		};
	});
}
