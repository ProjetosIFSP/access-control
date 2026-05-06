import {
	createServer as createHttpServer,
	type IncomingMessage,
} from "node:http";
import { createRequire } from "node:module";
import { createServer as createNetServer } from "node:net";
import type { Duplex } from "node:stream";
import type { AedesPublishPacket, Client, PublishPacket } from "aedes";
import { config as loadEnv } from "dotenv";
import pino from "pino";
import { fetch, Headers } from "undici";
import websocketStream from "websocket-stream";
import type WebSocket from "ws";
import { WebSocketServer } from "ws";
import z from "zod";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

loadEnv();

const require = createRequire(import.meta.url);
const aedesModule = require("aedes") as {
	createBroker?: () => {
		handle: (...args: unknown[]) => void;
		on: (...args: unknown[]) => void;
	};
	(): {
		handle: (...args: unknown[]) => void;
		on: (...args: unknown[]) => void;
	};
};

const createBroker =
	typeof aedesModule.createBroker === "function"
		? aedesModule.createBroker
		: aedesModule;

const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
});

const API_BASE_URL = process.env.API_BASE_URL ?? "http://server:3333";
const MQTT_PORT = parseInt(process.env.MQTT_PORT ?? "1883", 10);
const WS_PORT = parseInt(process.env.MQTT_WS_PORT ?? "9001", 10);
const COMMAND_POLL_INTERVAL = parseInt(
	process.env.COMMAND_POLL_INTERVAL ?? "1000",
	10,
);

const doorStateValues = ["OPEN", "CLOSED", "LOCKED", "UNKNOWN"] as const;
const credentialTypeValues = ["FINGERPRINT", "NFC_TAG"] as const;
const commandTypeValues = [
	"UNLOCK",
	"LOCK",
	"SYNC_STATE",
	"NFC_WRITE",
] as const;
const commandAckStatusValues = ["COMPLETED", "FAILED"] as const;

type CommandType = (typeof commandTypeValues)[number];

const sensorProtocolValues = ["R30X", "BOLAND"] as const;

const registerPayloadSchema = z.object({
	roomId: z.string().min(1).optional(),
	pairingMode: z.boolean().optional(),
	firmwareVersion: z.string().min(1).optional(),
	sensorProtocol: z.enum(sensorProtocolValues).optional(),
	sensorModel: z.string().min(1).optional(),
});

const heartbeatPayloadSchema = z
	.object({
		firmwareVersion: z.string().min(1).optional(),
	})
	.optional();

const statusPayloadSchema = z.object({
	doorState: z.enum(doorStateValues),
	isLocked: z.boolean(),
	firmwareVersion: z.string().min(1).optional(),
});

const accessAttemptPayloadSchema = z.object({
	credentialType: z.enum(credentialTypeValues),
	credentialValue: z.string().min(1),
	requestId: z.string().min(1).optional(),
	/** userId gravado no setor MIFARE do cartão — para dupla verificação */
	cardUserId: z.string().optional(),
	/** Token de autenticação do dispositivo IoT */
	deviceSecret: z.string().optional(),
});

const localMatchPayloadSchema = z.object({
	credentialId: z.string().min(1),
	confidence: z.number(),
	slotId: z.number(),
	deviceSecret: z.string().optional(),
});

const accessDecisionSchema = z.object({
	status: z.enum(["GRANTED", "DENIED"] as const),
	reason: z.string().nullable(),
	requestId: z.string().optional(),
	credentialId: z.string().optional(),
	user: z
		.object({
			id: z.string(),
			name: z.string(),
			isAdmin: z.boolean(),
		})
		.optional(),
	room: z
		.object({
			id: z.string(),
			name: z.string(),
		})
		.optional(),
});

const commandAckPayloadSchema = z.object({
	commandId: z.string().min(1),
	status: z.enum(commandAckStatusValues),
	resultPayload: z.record(z.string(), z.any()).optional(),
	errorMessage: z.string().optional(),
});

const commandResponseSchema = z.object({
	commands: z.array(
		z.object({
			id: z.string(),
			type: z.enum(commandTypeValues),
			status: z.string(),
			payload: z.record(z.string(), z.any()),
			expiresAt: z.string().nullable(),
			sentAt: z.string().nullable().optional(),
		}),
	),
});

const apiRegisterResponseSchema = z.object({
	controller: z.object({
		id: z.string(),
		roomId: z.string().nullable(),
		pairingMode: z.boolean(),
		firmwareVersion: z.string().nullable(),
		sensorProtocol: z.string().nullable(),
		sensorModel: z.string().nullable(),
		lastSeenAt: z.string(),
	}),
});

const apiRoomStatusResponseSchema = z.object({
	room: z.object({
		id: z.string(),
		name: z.string(),
		doorState: z.enum(doorStateValues),
		isLocked: z.boolean(),
		lastStatusUpdateAt: z.string().nullable(),
	}),
});

const enrollmentResultPayloadSchema = z.object({
	enrollmentId: z.string().min(1),
	userId: z.string().min(1),
	finger: z.string().min(1),
	status: z.enum(["SUCCESS", "FAILED", "EXPIRED"] as const),
	template: z.string().optional(),
	quality: z.number().optional(),
});

const enrollmentProgressPayloadSchema = z.object({
	enrollmentId: z.string().min(1),
	step: z.enum([
		"WAITING_FIRST",
		"FIRST_CAPTURED",
		"SECOND_CAPTURED",
		"CREATING_MODEL",
		"EXTRACTING",
		"FAILED",
		"EXPIRED",
	] as const),
});

const topicMatchers = {
	register: /^door\/([^/]+)\/register$/,
	heartbeat: /^door\/([^/]+)\/heartbeat$/,
	status: /^door\/([^/]+)\/status$/,
	access: /^door\/([^/]+)\/access-attempt$/,
	localMatch: /^door\/([^/]+)\/local-match$/,
	commandResult: /^door\/([^/]+)\/command-result$/,
	enrollmentResult: /^door\/([^/]+)\/enrollment-result$/,
	enrollmentProgress: /^door\/([^/]+)\/enrollment-progress$/,
} as const;

type TopicKind = keyof typeof topicMatchers;

const commandPollers = new Map<string, NodeJS.Timeout>();

const broker = createBroker() as any;
const mqttServer = createNetServer(broker.handle);
mqttServer.listen(MQTT_PORT, () => {
	logger.info({ port: MQTT_PORT }, "MQTT TCP server listening");
});

const wsHttpServer = createHttpServer();
const wsServer = new WebSocketServer({ server: wsHttpServer });
wsServer.on("connection", (socket: WebSocket, request:IncomingMessage) => {
	const stream = websocketStream(socket as any) as Duplex;
	broker.handle(stream, request);
});
wsHttpServer.listen(WS_PORT, () => {
	logger.info({ port: WS_PORT }, "MQTT WebSocket server listening");
});

broker.on("client", (client: Client) => {
	logger.debug({ clientId: client.id }, "Client connected");
});

broker.on("clientDisconnect", (client: Client) => {
	logger.debug({ clientId: client.id }, "Client disconnected");
});

broker.on("publish", (packet: AedesPublishPacket, client: Client | null) => {
	if (!client) {
		return;
	}

	const topic = packet.topic?.toString();
	if (!topic) {
		return;
	}

	const payloadString = packet.payload?.toString() ?? "";

	if (handleTopic("register", topic, payloadString, handleRegister)) return;
	if (handleTopic("heartbeat", topic, payloadString, handleHeartbeat)) return;
	if (handleTopic("status", topic, payloadString, handleStatus)) return;
	if (handleTopic("access", topic, payloadString, handleAccessAttempt)) return;
	if (handleTopic("localMatch", topic, payloadString, handleLocalMatch)) return;
	if (handleTopic("commandResult", topic, payloadString, handleCommandResult))
		return;
	if (handleTopic("enrollmentProgress", topic, payloadString, handleEnrollmentProgress))
		return;
	handleTopic("enrollmentResult", topic, payloadString, handleEnrollmentResult);
});

function handleTopic(
	kind: TopicKind,
	topic: string,
	payload: string,
	handler: (controllerId: string, payload: string) => Promise<void>,
) {
	const match = topicMatchers[kind].exec(topic);
	if (!match) {
		return false;
	}

	handler(match[1], payload).catch((error) => {
		logger.error(
			{ err: error, controllerId: match[1], topic, payload },
			"Failed to process topic",
		);
	});

	return true;
}

const requestSyncPayloadSchema = z.object({
	deviceSecret: z.string().optional(),
});

async function handleRequestSync(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = requestSyncPayloadSchema.parse(parsed);

	await callApi(
		"POST",
		`/iot/devices/${controllerId}/request-sync`,
		JSON.stringify({
			deviceSecret: data.deviceSecret,
		}),
	);

	triggerFingerprintSync(controllerId).catch((err) => {
		logger.error({ err, controllerId }, "Hardware triggered fingerprint sync failed");
	});
}

async function handleRegister(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = registerPayloadSchema.parse(parsed);
	const response = await callApi(
		"PUT",
		`/iot/devices/${controllerId}`,
		JSON.stringify({
			roomId: data.roomId,
			pairingMode: data.pairingMode,
			firmwareVersion: data.firmwareVersion,
			sensorProtocol: data.sensorProtocol,
			sensorModel: data.sensorModel,
		}),
	);

	const registerResponse = apiRegisterResponseSchema.parse(response);
	logger.info(
		{
			controllerId,
			roomId: registerResponse.controller.roomId,
			pairingMode: registerResponse.controller.pairingMode,
			sensorProtocol: registerResponse.controller.sensorProtocol,
			sensorModel: registerResponse.controller.sensorModel,
		},
		"Controller registered",
	);

	ensureCommandPolling(controllerId);
}

async function handleHeartbeat(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = heartbeatPayloadSchema.parse(parsed);

	await callApi(
		"PATCH",
		`/iot/devices/${controllerId}/heartbeat`,
		JSON.stringify(data),
	);
	ensureCommandPolling(controllerId);
}

async function handleStatus(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = statusPayloadSchema.parse(parsed);

	const response = await callApi(
		"PUT",
		`/iot/devices/${controllerId}/status`,
		JSON.stringify({
			doorState: data.doorState,
			isLocked: data.isLocked,
			firmwareVersion: data.firmwareVersion,
		}),
	);

	const roomStatus = apiRoomStatusResponseSchema.parse(response);
	logger.debug(
		{
			controllerId,
			roomId: roomStatus.room.id,
			doorState: roomStatus.room.doorState,
			isLocked: roomStatus.room.isLocked,
		},
		"Door status updated",
	);
}

async function handleAccessAttempt(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = accessAttemptPayloadSchema.parse(parsed);

	const response = await callApi(
		"POST",
		`/iot/devices/${controllerId}/access-attempts`,
		JSON.stringify({
			credentialType: data.credentialType,
			credentialValue: data.credentialValue,
			requestId: data.requestId,
			cardUserId: data.cardUserId,
			deviceSecret: data.deviceSecret,
		}),
	);

	const decision = accessDecisionSchema.parse(response);
	// Inclui userId para que o firmware possa gravar no cartão MIFARE
	// no mesmo toque (toque único) sem necessidade de uma 2ª aproximação.
	await publish(`door/${controllerId}/access-result`, decision);
	logger.info(
		{
			controllerId,
			status: decision.status,
			reason: decision.reason,
			userId: decision.user?.id,
			roomId: decision.room?.id,
		},
		"Processed access attempt",
	);

	if (decision.status === "GRANTED") {
		await enqueueUnlockCommand(controllerId);
	}
}

async function handleLocalMatch(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = localMatchPayloadSchema.parse(parsed);

	const response = await callApi(
		"POST",
		`/iot/devices/${controllerId}/local-match`,
		JSON.stringify({
			credentialId: data.credentialId,
			confidence: data.confidence,
			deviceSecret: data.deviceSecret,
		}),
	);

	const decision = accessDecisionSchema.parse(response);
	await publish(`door/${controllerId}/access-result`, decision);
	logger.info(
		{
			controllerId,
			status: decision.status,
			reason: decision.reason,
			credentialId: data.credentialId,
			confidence: data.confidence,
		},
		"Processed local biometric match",
	);

	if (decision.status === "GRANTED") {
		await enqueueUnlockCommand(controllerId);
	}
}

async function handleEnrollmentResult(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = enrollmentResultPayloadSchema.parse(parsed);

	logger.info(
		{
			controllerId,
			enrollmentId: data.enrollmentId,
			userId: data.userId,
			finger: data.finger,
			status: data.status,
		},
		"Enrollment result received",
	);

	if (data.status !== "SUCCESS" || !data.template) {
		logger.warn(
			{ controllerId, enrollmentId: data.enrollmentId, status: data.status },
			"Enrollment did not complete — skipping credential registration",
		);
		return;
	}

	// Usa a rota IoT interna que não exige cookie de sessão.
	// O controllerId autentica a origem — apenas controladores registrados chegam aqui.
	await callApi(
		"POST",
		`/iot/devices/${controllerId}/enrollment`,
		JSON.stringify({
			userId: data.userId,
			finger: data.finger,
			template: data.template,
			enrollmentId: data.enrollmentId,
		}),
	);

	logger.info(
		{
			controllerId,
			enrollmentId: data.enrollmentId,
			userId: data.userId,
			finger: data.finger,
		},
		"Fingerprint credential registered via MQTT enrollment",
	);
}

async function handleEnrollmentProgress(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = enrollmentProgressPayloadSchema.parse(parsed);

	logger.info(
		{ controllerId, enrollmentId: data.enrollmentId, step: data.step },
		"Enrollment progress",
	);

	// Forward to backend SSE
	await callApi(
		"POST",
		`/iot/devices/${controllerId}/enrollment-progress`,
		JSON.stringify({
			enrollmentId: data.enrollmentId,
			step: data.step,
		}),
	);
}

async function handleCommandResult(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = commandAckPayloadSchema.parse(parsed);

	await callApi(
		"PATCH",
		`/iot/devices/${controllerId}/commands/${data.commandId}/ack`,
		JSON.stringify({
			status: data.status,
			resultPayload: data.resultPayload,
			errorMessage: data.errorMessage,
		}),
	);
}

function safeParseJson(payload: string) {
	if (!payload) {
		return {};
	}

	try {
		return JSON.parse(payload);
	} catch {
		logger.warn({ payload }, "Invalid JSON payload, treating as empty object");
		return {};
	}
}

async function callApi(method: HttpMethod, path: string, body?: string) {
	const headers = new Headers();
	if (body && method !== "GET") {
		headers.set("content-type", "application/json");
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		method,
		headers,
		body: method !== "GET" ? body : undefined,
	});

	if (!response.ok) {
		const errorPayload = await response.text();
		throw new Error(
			`API request failed (${method} ${path} → ${response.status}): ${errorPayload || response.statusText}`,
		);
	}

	if (response.headers.get("content-length") === "0") {
		return {};
	}

	const text = await response.text();
	if (!text) {
		return {};
	}

	try {
		return JSON.parse(text);
	} catch {
		logger.warn({ method, path, body, text }, "Received non-JSON response");
		return {};
	}
}

async function publish(topic: string, message: unknown) {
	const payload = Buffer.from(JSON.stringify(message));
	const packet: PublishPacket = {
		cmd: "publish",
		qos: 0,
		topic,
		payload,
		retain: false,
		dup: false,
	};

	await new Promise<void>((resolve, reject) => {
		broker.publish(packet, (error?: Error | null) => {
			if (error) {
				reject(error);
				return;
			}

			resolve();
		});
	});
}

function ensureCommandPolling(controllerId: string) {
	if (commandPollers.has(controllerId)) {
		return;
	}

	pollCommands(controllerId).catch((error) => {
		logger.error({ err: error, controllerId }, "Command polling failed");
	});

	const interval = setInterval(() => {
		pollCommands(controllerId).catch((error) => {
			logger.error({ err: error, controllerId }, "Command polling failed");
		});
	}, COMMAND_POLL_INTERVAL);

	commandPollers.set(controllerId, interval);
}

async function pollCommands(controllerId: string) {
	const response = await callApi(
		"GET",
		`/iot/devices/${controllerId}/commands?limit=5`,
	);

	const parsed = commandResponseSchema.parse(response);

	for (const command of parsed.commands) {
		const commandPayload = {
			commandId: command.id,
			type: command.type satisfies CommandType,
			payload: command.payload,
			expiresAt: command.expiresAt,
		};

		if (
			command.type === "SYNC_STATE" &&
			command.payload?.kind === "ENROLLMENT"
		) {
			await publish(`door/${controllerId}/enter-enrollment-mode`, {
				enrollmentId: command.payload.enrollmentId,
				userId: command.payload.userId,
				finger: command.payload.finger,
				expiresAt: command.payload.expiresAt,
			});
			continue;
		}

		// When a room is linked to a controller, sync all authorized fingerprints
		if (
			command.type === "SYNC_STATE" &&
			command.payload?.action === "link"
		) {
			await publish(`door/${controllerId}/command`, commandPayload);
			// Trigger fingerprint sync in background (don't block command polling)
			triggerFingerprintSync(controllerId).catch((err) => {
				logger.error({ err, controllerId }, "Background fingerprint sync failed");
			});
			continue;
		}

		await publish(`door/${controllerId}/command`, commandPayload);
	}
}

async function enqueueUnlockCommand(controllerId: string) {
	try {
		await callApi(
			"POST",
			`/iot/devices/${controllerId}/commands`,
			JSON.stringify({
				type: "UNLOCK",
				payload: {},
			}),
		);
		await pollCommands(controllerId);
	} catch (error) {
		logger.error(
			{ err: error, controllerId },
			"Unable to enqueue unlock command",
		);
	}
}

async function triggerFingerprintSync(controllerId: string) {
	try {
		const response = await callApi(
			"GET",
			`/iot/devices/${controllerId}/fingerprint-sync`,
		);

		const credentials = (response as { credentials: Array<{ credentialId: string; template: string }> }).credentials;
		if (!credentials || credentials.length === 0) {
			logger.info({ controllerId }, "No fingerprints to sync");
			return;
		}

		logger.info(
			{ controllerId, count: credentials.length },
			"Starting fingerprint sync to device",
		);

		// Publish each template individually with a delay
		// so the ESP8266 can process each one without memory issues
		for (const cred of credentials) {
			await publish(`door/${controllerId}/sync-template`, {
				credentialId: cred.credentialId,
				template: cred.template,
			});
			// Wait for the firmware to process before sending next
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		await publish(`door/${controllerId}/sync-complete`, {});

		logger.info(
			{ controllerId, synced: credentials.length },
			"Fingerprint sync completed",
		);
	} catch (error) {
		logger.error(
			{ err: error, controllerId },
			"Fingerprint sync failed",
		);
	}
}

function shutdown() {
	logger.info("Shutting down broker");
	for (const interval of commandPollers.values()) {
		clearInterval(interval);
	}
	commandPollers.clear();
	broker.close(() => {
		mqttServer.close();
		wsServer.close();
		wsHttpServer.close(() => {
			logger.info("Broker closed");
			process.exit(0);
		});
	});
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
