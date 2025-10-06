import { createServer as createHttpServer, type IncomingMessage } from "http";
import { createServer as createNetServer } from "net";
import { Duplex } from "stream";
import {
	createBroker,
	type Client,
	type PublishPacket,
	type AedesPublishPacket,
} from "aedes";
import { config as loadEnv } from "dotenv";
import pino from "pino";
import { fetch, Headers } from "undici";
import websocketStream from "websocket-stream";
import WebSocket, { WebSocketServer } from "ws";
import z from "zod";

loadEnv();

const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
});

const API_BASE_URL = process.env.API_BASE_URL ?? "http://server:3000";
const MQTT_PORT = parseInt(process.env.MQTT_PORT ?? "1883", 10);
const WS_PORT = parseInt(process.env.MQTT_WS_PORT ?? "9001", 10);
const COMMAND_POLL_INTERVAL = parseInt(
	process.env.COMMAND_POLL_INTERVAL ?? "1000",
	10,
);

const doorStateValues = ["OPEN", "CLOSED", "UNKNOWN"] as const;
const credentialTypeValues = ["FINGERPRINT", "NFC_TAG"] as const;
const commandTypeValues = ["UNLOCK", "LOCK", "SYNC_STATE"] as const;
const commandAckStatusValues = ["COMPLETED", "FAILED"] as const;

type DoorState = (typeof doorStateValues)[number];
type CredentialType = (typeof credentialTypeValues)[number];
type CommandType = (typeof commandTypeValues)[number];
type CommandAckStatus = (typeof commandAckStatusValues)[number];

const registerPayloadSchema = z.object({
	roomId: z.string().min(1),
	firmwareVersion: z.string().min(1).optional(),
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
});

const accessDecisionSchema = z.object({
	status: z.enum(["GRANTED", "DENIED"] as const),
	reason: z.string().nullable(),
	requestId: z.string().optional(),
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
		roomId: z.string(),
		firmwareVersion: z.string().nullable(),
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

const topicMatchers = {
	register: /^door\/([^/]+)\/register$/,
	heartbeat: /^door\/([^/]+)\/heartbeat$/,
	status: /^door\/([^/]+)\/status$/,
	access: /^door\/([^/]+)\/access-attempt$/,
	commandResult: /^door\/([^/]+)\/command-result$/,
} as const;

type TopicKind = keyof typeof topicMatchers;

const commandPollers = new Map<string, NodeJS.Timeout>();

const broker = createBroker();
const mqttServer = createNetServer(broker.handle);
mqttServer.listen(MQTT_PORT, () => {
	logger.info({ port: MQTT_PORT }, "MQTT TCP server listening");
});

const wsHttpServer = createHttpServer();
const wsServer = new WebSocketServer({ server: wsHttpServer });
wsServer.on("connection", (socket: WebSocket, request: IncomingMessage) => {
	const stream = websocketStream(socket as unknown as any) as Duplex;
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
	handleTopic("commandResult", topic, payloadString, handleCommandResult);
});

function handleTopic<TBody>(
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

async function handleRegister(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = registerPayloadSchema.parse(parsed);
	const response = await callApi(
		`/iot/devices/register`,
		JSON.stringify({
			controllerId,
			roomId: data.roomId,
			firmwareVersion: data.firmwareVersion,
		}),
	);

	const registerResponse = apiRegisterResponseSchema.parse(response);
	logger.info(
		{
			controllerId,
			roomId: registerResponse.controller.roomId,
		},
		"Controller registered",
	);

	ensureCommandPolling(controllerId);
}

async function handleHeartbeat(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = heartbeatPayloadSchema.parse(parsed);

	await callApi(`/iot/devices/${controllerId}/heartbeat`, JSON.stringify(data));
	ensureCommandPolling(controllerId);
}

async function handleStatus(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = statusPayloadSchema.parse(parsed);

	const response = await callApi(
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
		`/iot/devices/${controllerId}/access-attempt`,
		JSON.stringify({
			credentialType: data.credentialType,
			credentialValue: data.credentialValue,
			requestId: data.requestId,
		}),
	);

	const decision = accessDecisionSchema.parse(response);
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

async function handleCommandResult(controllerId: string, payload: string) {
	const parsed = safeParseJson(payload);
	const data = commandAckPayloadSchema.parse(parsed);

	await callApi(
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
	} catch (error) {
		logger.warn({ payload }, "Invalid JSON payload, treating as empty object");
		return {};
	}
}

async function callApi(path: string, body?: string) {
	const headers = new Headers();
	if (body) {
		headers.set("content-type", "application/json");
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		method: "POST",
		headers,
		body,
	});

	if (!response.ok) {
		const errorPayload = await response.text();
		throw new Error(
			`API request failed (${response.status}): ${errorPayload || response.statusText}`,
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
	} catch (error) {
		logger.warn({ path, body, text }, "Received non-JSON response");
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
		`/iot/devices/${controllerId}/commands/pull`,
		JSON.stringify({ limit: 5 }),
	);

	const parsed = commandResponseSchema.parse(response);

	for (const command of parsed.commands) {
		await publish(`door/${controllerId}/command`, {
			commandId: command.id,
			type: command.type satisfies CommandType,
			payload: command.payload,
			expiresAt: command.expiresAt,
		});
	}
}

async function enqueueUnlockCommand(controllerId: string) {
	try {
		await callApi(
			`/iot/devices/${controllerId}/commands`,
			JSON.stringify({
				type: "UNLOCK",
				payload: {},
			}),
		);
		await pollCommands(controllerId);
	} catch (error) {
		logger.error({ err: error, controllerId }, "Unable to enqueue unlock command");
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
