import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { doorController } from "@/db/schema/door";

export interface OnlineDoorControllerSummary {
	id: string;
	roomId: string;
	sensorProtocol: "R30X" | "BOLAND" | null;
	sensorModel: string | null;
	firmwareVersion: string | null;
	lastSeenAt: Date;
	isOnline: boolean;
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Retorna todos os controladores de porta que possuem sensor biométrico configurado.
 * Qualquer fechadura pode atuar como terminal de enrollment temporariamente (ARCH-003).
 * O campo `isOnline` indica se o controlador fez heartbeat nos últimos 5 minutos.
 */
export async function getOnlineDoorControllersForEnrollment(): Promise<
	OnlineDoorControllerSummary[]
> {
	const controllers = await db
		.select({
			id: doorController.id,
			roomId: doorController.roomId,
			sensorProtocol: doorController.sensorProtocol,
			sensorModel: doorController.sensorModel,
			firmwareVersion: doorController.firmwareVersion,
			lastSeenAt: doorController.lastSeenAt,
		})
		.from(doorController)
		.where(isNotNull(doorController.sensorProtocol))
		.orderBy(doorController.lastSeenAt);

	const now = Date.now();

	return controllers.filter(c => c.roomId !== null).map((c) => ({
		id: c.id,
		roomId: c.roomId as string,
		sensorProtocol: c.sensorProtocol as "R30X" | "BOLAND" | null,
		sensorModel: c.sensorModel,
		firmwareVersion: c.firmwareVersion,
		lastSeenAt: c.lastSeenAt,
		isOnline: now - c.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS,
	}));
}
