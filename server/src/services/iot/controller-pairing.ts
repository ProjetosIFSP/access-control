import { and, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { doorController } from "@/db/schema/door";

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
	await db
		.update(doorController)
		.set({ roomId: null })
		.where(
			and(
				eq(doorController.roomId, roomId),
				ne(doorController.id, controllerId),
			),
		);

	const [updated] = await db
		.update(doorController)
		.set({ roomId })
		.where(
			and(
				eq(doorController.id, controllerId),
				or(isNull(doorController.roomId), eq(doorController.roomId, roomId)),
			),
		)
		.returning({ id: doorController.id });

	if (!updated) {
		throw new ControllerNotAvailableError(controllerId);
	}
}

export async function unbindControllerFromRoom(roomId: string): Promise<void> {
	await db
		.update(doorController)
		.set({ roomId: null })
		.where(eq(doorController.roomId, roomId));
}
