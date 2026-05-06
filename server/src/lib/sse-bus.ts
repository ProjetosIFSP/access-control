import { EventEmitter } from "node:events";

// ── Types ──
export type ControllerStatusEvent = {
	controllerId: string;
	roomId: string | null;
	isOnline: boolean;
	lastSeenAt: string;
	sensorProtocol: string | null;
	sensorModel: string | null;
	firmwareVersion: string | null;
};

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

export type EnrollmentProgressEvent = {
	controllerId: string;
	enrollmentId: string;
	step: string;
};

// ── Bus ───────────────────────────────────────────────────────────────────────

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const ROOM_STATUS_EVENT = "room:status";
const DEVICE_ACCESS_ATTEMPT_EVENT = "device:access_attempt";
const CONTROLLER_STATUS_EVENT = "controller:status";
const ENROLLMENT_PROGRESS_EVENT = "enrollment:progress";

export const sseBus = {
	publishControllerStatus(event: ControllerStatusEvent) {
		emitter.emit(CONTROLLER_STATUS_EVENT, event);
	},

	subscribeControllerStatus(handler: (event: ControllerStatusEvent) => void) {
		emitter.on(CONTROLLER_STATUS_EVENT, handler);
		return () => emitter.off(CONTROLLER_STATUS_EVENT, handler);
	},

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

	subscribeDeviceAccessAttempt(
		handler: (event: DeviceAccessAttemptEvent) => void,
	) {
		emitter.on(DEVICE_ACCESS_ATTEMPT_EVENT, handler);
		return () => emitter.off(DEVICE_ACCESS_ATTEMPT_EVENT, handler);
	},

	publishEnrollmentProgress(event: EnrollmentProgressEvent) {
		emitter.emit(ENROLLMENT_PROGRESS_EVENT, event);
	},

	subscribeEnrollmentProgress(
		handler: (event: EnrollmentProgressEvent) => void,
	) {
		emitter.on(ENROLLMENT_PROGRESS_EVENT, handler);
		return () => emitter.off(ENROLLMENT_PROGRESS_EVENT, handler);
	},
};
