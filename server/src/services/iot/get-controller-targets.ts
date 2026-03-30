import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { doorController } from "@/db/schema/door";
import { room } from "@/db/schema/room";

export interface PairingControllerTarget {
	controllerId: string;
	firmwareVersion: string | null;
	lastSeenAt: Date;
	sensorModel: string | null;
	sensorProtocol: string | null;
}

export interface RoomControllerTarget {
	controllerId: string;
	roomId: string;
	roomName: string;
	firmwareVersion: string | null;
	lastSeenAt: Date;
	sensorModel: string | null;
	sensorProtocol: string | null;
}

export interface ControllerTargetsResult {
	pairingControllers: PairingControllerTarget[];
	roomControllers: RoomControllerTarget[];
}

export async function getControllerTargets(): Promise<ControllerTargetsResult> {
	const pairingControllers = await db
		.select({
			controllerId: doorController.id,
			firmwareVersion: doorController.firmwareVersion,
			lastSeenAt: doorController.lastSeenAt,
			sensorModel: doorController.sensorModel,
			sensorProtocol: doorController.sensorProtocol,
		})
		.from(doorController)
		.where(isNull(doorController.roomId))
		.orderBy(desc(doorController.lastSeenAt));

	const roomControllers = await db
		.select({
			controllerId: doorController.id,
			roomId: room.id,
			roomName: room.name,
			firmwareVersion: doorController.firmwareVersion,
			lastSeenAt: doorController.lastSeenAt,
			sensorModel: doorController.sensorModel,
			sensorProtocol: doorController.sensorProtocol,
		})
		.from(doorController)
		.innerJoin(room, eq(room.id, doorController.roomId))
		.orderBy(room.name);

	return {
		pairingControllers,
		roomControllers,
	};
}
