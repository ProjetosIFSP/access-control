import { eq, isNull, gte, and } from "drizzle-orm";
import { db } from "@/db";
import { doorController } from "@/db/schema/door";
import { doorStateEnum, sensorProtocolEnum } from "@/db/schema/enums";
import { room } from "@/db/schema/room";

const DOOR_STATES = doorStateEnum.enumValues;

type DoorState = (typeof DOOR_STATES)[number];

const SENSOR_PROTOCOLS = sensorProtocolEnum.enumValues;
type SensorProtocol = (typeof SENSOR_PROTOCOLS)[number];

interface RegisterDoorControllerInput {
	controllerId: string;
	roomId?: string;
	firmwareVersion?: string;
	sensorProtocol?: SensorProtocol;
	sensorModel?: string;
}

interface RegisterDoorControllerResult {
	controller: {
		id: string;
		roomId: string | null;
		firmwareVersion: string | null;
		sensorProtocol: string | null;
		sensorModel: string | null;
		lastSeenAt: Date;
	};
}

export async function registerDoorController(
	input: RegisterDoorControllerInput,
): Promise<RegisterDoorControllerResult> {
	const { controllerId, roomId, firmwareVersion, sensorProtocol, sensorModel } =
		input;
	const now = new Date();

	const [controller] = await db
		.insert(doorController)
		.values({
			id: controllerId,
			roomId: roomId ?? null,
			firmwareVersion: firmwareVersion ?? null,
			sensorProtocol: sensorProtocol ?? null,
			sensorModel: sensorModel ?? null,
			lastSeenAt: now,
		})
		.onConflictDoUpdate({
			target: doorController.id,
			set: {
				...(roomId !== undefined ? { roomId } : {}),
				firmwareVersion: firmwareVersion ?? null,
				...(sensorProtocol !== undefined ? { sensorProtocol } : {}),
				...(sensorModel !== undefined ? { sensorModel } : {}),
				lastSeenAt: now,
			},
		})
		.returning({
			id: doorController.id,
			roomId: doorController.roomId,
			firmwareVersion: doorController.firmwareVersion,
			sensorProtocol: doorController.sensorProtocol,
			sensorModel: doorController.sensorModel,
			lastSeenAt: doorController.lastSeenAt,
		});

	return {
		controller,
	};
}

interface RecordDoorHeartbeatInput {
	controllerId: string;
	firmwareVersion?: string;
}

export async function recordDoorHeartbeat(input: RecordDoorHeartbeatInput) {
	const { controllerId, firmwareVersion } = input;
	const now = new Date();

	const [controller] = await db
		.update(doorController)
		.set({
			lastSeenAt: now,
			...(firmwareVersion ? { firmwareVersion } : {}),
		})
		.where(eq(doorController.id, controllerId))
		.returning({
			id: doorController.id,
			roomId: doorController.roomId,
			firmwareVersion: doorController.firmwareVersion,
			sensorProtocol: doorController.sensorProtocol,
			sensorModel: doorController.sensorModel,
			lastSeenAt: doorController.lastSeenAt,
		});

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

		if (!controller.roomId) {
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

export async function getPairingControllers() {
	const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

	const controllers = await db
		.select({
			id: doorController.id,
			sensorProtocol: doorController.sensorProtocol,
			sensorModel: doorController.sensorModel,
			firmwareVersion: doorController.firmwareVersion,
			lastSeenAt: doorController.lastSeenAt,
		})
		.from(doorController)
		.where(
			and(
				isNull(doorController.roomId),
				gte(doorController.lastSeenAt, oneMinuteAgo)
			)
		);

	return controllers;
}
