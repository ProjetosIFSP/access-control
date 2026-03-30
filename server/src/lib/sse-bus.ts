import { EventEmitter } from "node:events";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RoomStatusEvent = {
	roomId: string;
	doorState: string;
	isLocked: boolean | null;
	lastStatusUpdateAt: string | null;
};

export type DeviceAccessAttemptEvent = {
	controllerId: string;
	credentialType: string;
	credentialValue: string;
	timestamp: string;
};

// ── Bus ───────────────────────────────────────────────────────────────────────

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const ROOM_STATUS_EVENT = "room:status";
const DEVICE_ACCESS_ATTEMPT_EVENT = "device:access_attempt";

export const sseBus = {
	publishRoomStatus(event: RoomStatusEvent) {
		emitter.emit(ROOM_STATUS_EVENT, event);
	},

	subscribeRoomStatus(handler: (event: RoomStatusEvent) => void) {
		emitter.on(ROOM_STATUS_EVENT, handler);
		return () => emitter.off(ROOM_STATUS_EVENT, handler);
	},

	publishDeviceAccessAttempt(event: DeviceAccessAttemptEvent) {
		emitter.emit(DEVICE_ACCESS_ATTEMPT_EVENT, event);
	},

	subscribeDeviceAccessAttempt(handler: (event: DeviceAccessAttemptEvent) => void) {
		emitter.on(DEVICE_ACCESS_ATTEMPT_EVENT, handler);
		return () => emitter.off(DEVICE_ACCESS_ATTEMPT_EVENT, handler);
	},
};
