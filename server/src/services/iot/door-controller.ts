import { db } from "@/db";
import { doorController } from "@/db/schema/door";
import { room } from "@/db/schema/room";
import { doorStateEnum } from "@/db/schema/enums";
import { eq } from "drizzle-orm";

const DOOR_STATES = doorStateEnum.enumValues;

type DoorState = (typeof DOOR_STATES)[number];

interface RegisterDoorControllerInput {
	controllerId: string;
	roomId: string;
	firmwareVersion?: string;
}

interface RegisterDoorControllerResult {
	controller: {
		id: string;
		roomId: string;
		firmwareVersion: string | null;
		lastSeenAt: Date;
	};
}

export async function registerDoorController(
	input: RegisterDoorControllerInput,
): Promise<RegisterDoorControllerResult> {
	const { controllerId, roomId, firmwareVersion } = input;
	const now = new Date();

	const [controller] = await db
		.insert(doorController)
		.values({
			id: controllerId,
			roomId,
			firmwareVersion: firmwareVersion ?? null,
			lastSeenAt: now,
		})
		.onConflictDoUpdate({
			target: doorController.id,
			set: {
				roomId,
				firmwareVersion: firmwareVersion ?? null,
				lastSeenAt: now,
			},
		})
		.returning();

	return {
		controller,
	};
}

interface RecordDoorHeartbeatInput {
	controllerId: string;
	firmwareVersion?: string;
}

export async function recordDoorHeartbeat(
	input: RecordDoorHeartbeatInput,
) {
	const { controllerId, firmwareVersion } = input;
	const now = new Date();

	const [controller] = await db
		.update(doorController)
		.set({
			lastSeenAt: now,
			...(firmwareVersion ? { firmwareVersion } : {}),
		})
		.where(eq(doorController.id, controllerId))
		.returning();

	return controller ?? null;
}

interface UpdateDoorStatusInput {
	controllerId: string;
	doorState: DoorState;
	isLocked: boolean;
	firmwareVersion?: string;
}

export async function updateDoorStatus(input: UpdateDoorStatusInput) {
	const { controllerId, doorState, isLocked, firmwareVersion } = input;
	const now = new Date();

	return await db.transaction(async (tx) => {
		const [controller] = await tx
			.select({
				id: doorController.id,
				roomId: doorController.roomId,
			})
			.from(doorController)
			.where(eq(doorController.id, controllerId));

		if (!controller) {
			return null;
		}

		await tx
			.update(doorController)
			.set({
				lastSeenAt: now,
				...(firmwareVersion ? { firmwareVersion } : {}),
			})
			.where(eq(doorController.id, controllerId));

		const [updatedRoom] = await tx
			.update(room)
			.set({
				doorState,
				isLocked,
				lastStatusUpdateAt: now,
			})
			.where(eq(room.id, controller.roomId))
			.returning({
				id: room.id,
				name: room.name,
				doorState: room.doorState,
				isLocked: room.isLocked,
				lastStatusUpdateAt: room.lastStatusUpdateAt,
			});

		return updatedRoom ?? null;
	});
}

export async function getDoorControllerById(controllerId: string) {
	const [controller] = await db
		.select({
			id: doorController.id,
			roomId: doorController.roomId,
			firmwareVersion: doorController.firmwareVersion,
			lastSeenAt: doorController.lastSeenAt,
		})
		.from(doorController)
		.where(eq(doorController.id, controllerId))
		.limit(1);

	return controller ?? null;
}
