import { EventEmitter } from "node:events";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoomStatusEvent = {
	roomId: string;
	doorState: string;
	isLocked: boolean | null;
	lastStatusUpdateAt: string | null;
};

// ── Bus ───────────────────────────────────────────────────────────────────────

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const ROOM_STATUS_EVENT = "room:status";

export const sseBus = {
	publishRoomStatus(event: RoomStatusEvent) {
		emitter.emit(ROOM_STATUS_EVENT, event);
	},

	subscribeRoomStatus(handler: (event: RoomStatusEvent) => void) {
		emitter.on(ROOM_STATUS_EVENT, handler);
		return () => emitter.off(ROOM_STATUS_EVENT, handler);
	},
};
