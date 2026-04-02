import { and, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { doorController } from "@/db/schema/door";
import { sseBus } from "@/lib/sse-bus";
import { createDoorCommand } from "./commands";

export class ControllerNotAvailableError extends Error {
	constructor(controllerId: string) {
		super(`Controlador ${controllerId} nao esta disponivel para pareamento.`);
		this.name = "ControllerNotAvailableError";
	}
}

export async function bindControllerToRoom(
	controllerId: string,
	roomId: string,
): Promise<void> {
	// Libera qualquer controlador previamente vinculado a esta sala.
	const releasedControllers = await db
		.update(doorController)
		.set({ roomId: null })
		.where(
			and(
				eq(doorController.roomId, roomId),
				ne(doorController.id, controllerId),
			),
		)
		.returning();

	for (const released of releasedControllers) {
		await createDoorCommand({
			controllerId: released.id,
			type: "SYNC_STATE",
			payload: { action: "unlink" },
		});
		sseBus.publishControllerStatus({
			...released,
			controllerId: released.id,
			roomId: null,
			isOnline: Date.now() - new Date(released.lastSeenAt).getTime() < 60000,
			lastSeenAt: released.lastSeenAt.toISOString(),
		});
	}

	const [updated] = await db
		.update(doorController)
		.set({ roomId })
		.where(
			and(
				eq(doorController.id, controllerId),
				or(isNull(doorController.roomId), eq(doorController.roomId, roomId)),
			),
		)
		.returning();

	if (updated) {
		await createDoorCommand({
			controllerId: updated.id,
			type: "SYNC_STATE",
			payload: { action: "link", roomId: updated.roomId },
		});
		sseBus.publishControllerStatus({
			...updated,
			controllerId: updated.id,
			roomId: updated.roomId,
			isOnline: Date.now() - new Date(updated.lastSeenAt).getTime() < 60000,
			lastSeenAt: updated.lastSeenAt.toISOString(),
		});
	}
	if (!updated) {
		throw new ControllerNotAvailableError(controllerId);
	}
}

export async function unbindControllerFromRoom(roomId: string): Promise<void> {
	const result = await db
		.update(doorController)
		.set({ roomId: null })
		.where(eq(doorController.roomId, roomId))
		.returning();

	for (const res of result) {
		await createDoorCommand({
			controllerId: res.id,
			type: "SYNC_STATE",
			payload: { action: "unlink" },
		});
		sseBus.publishControllerStatus({
			...res,
			controllerId: res.id,
			roomId: null,
			isOnline: Date.now() - new Date(res.lastSeenAt).getTime() < 60000,
			lastSeenAt: res.lastSeenAt.toISOString(),
		});
	}
}
