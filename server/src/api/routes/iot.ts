import { doorCommandTypeEnum, doorStateEnum, credentialTypeEnum } from "@/db/schema/enums";
import {
	createDoorCommand,
	pullPendingCommands,
	updateDoorCommandStatus,
} from "@/services/iot/commands";
import {
	processAccessAttempt,
} from "@/services/iot/access";
import {
	recordDoorHeartbeat,
	registerDoorController,
	updateDoorStatus,
} from "@/services/iot/door-controller";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

const doorStateValues = doorStateEnum.enumValues as [
	typeof doorStateEnum.enumValues[number],
	...typeof doorStateEnum.enumValues[number][],
];
const doorStateSchema = z.enum(doorStateValues);

const credentialTypeValues = credentialTypeEnum.enumValues as [
	typeof credentialTypeEnum.enumValues[number],
	...typeof credentialTypeEnum.enumValues[number][],
];
const credentialTypeSchema = z.enum(credentialTypeValues);

const commandTypeValues = doorCommandTypeEnum.enumValues as [
	typeof doorCommandTypeEnum.enumValues[number],
	...typeof doorCommandTypeEnum.enumValues[number][],
];
const commandTypeSchema = z.enum(commandTypeValues);

export const iotRoute: FastifyPluginAsyncZod = async (app) => {
	app.post(
		"/devices/register",
		{
			schema: {
				body: z.object({
					controllerId: z.string().min(1),
					roomId: z.string().min(1),
					firmwareVersion: z.string().min(1).optional(),
				}),
			},
		},
		async (request, reply) => {
			const body = request.body;
			const result = await registerDoorController(body);
			return reply.status(200).send({
				controller: {
					id: result.controller.id,
					roomId: result.controller.roomId,
					firmwareVersion: result.controller.firmwareVersion,
					lastSeenAt: result.controller.lastSeenAt.toISOString(),
				},
			});
		},
	);

	app.post(
		"/devices/:controllerId/heartbeat",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
				}),
				body: z
					.object({
						firmwareVersion: z.string().min(1).optional(),
					})
					.optional(),
			},
		},
		async (request, reply) => {
			const { controllerId } = request.params;
			const controller = await recordDoorHeartbeat({
				controllerId,
				firmwareVersion: request.body?.firmwareVersion,
			});

			if (!controller) {
				return reply.status(404).send({
					error: "Controller not registered",
					code: "CONTROLLER_NOT_FOUND",
				});
			}

			return reply.status(200).send({
				controller: {
					id: controller.id,
					roomId: controller.roomId,
					firmwareVersion: controller.firmwareVersion,
					lastSeenAt: controller.lastSeenAt.toISOString(),
				},
			});
		},
	);

	app.post(
		"/devices/:controllerId/status",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
				}),
				body: z.object({
					doorState: doorStateSchema,
					isLocked: z.boolean(),
					firmwareVersion: z.string().min(1).optional(),
				}),
			},
		},
		async (request, reply) => {
			const { controllerId } = request.params;
			const { doorState, isLocked, firmwareVersion } = request.body;
			const room = await updateDoorStatus({
				controllerId,
				doorState,
				isLocked,
				firmwareVersion,
			});

			if (!room) {
				return reply.status(404).send({
					error: "Controller not registered",
					code: "CONTROLLER_NOT_FOUND",
				});
			}

			return reply.status(200).send({
				room: {
					id: room.id,
					name: room.name,
					doorState: room.doorState,
					isLocked: room.isLocked,
					lastStatusUpdateAt: room.lastStatusUpdateAt?.toISOString() ?? null,
				},
			});
		},
	);

	app.post(
		"/devices/:controllerId/access-attempt",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
				}),
				body: z.object({
					credentialType: credentialTypeSchema,
					credentialValue: z.string().min(1),
					requestId: z.string().min(1).optional(),
				}),
			},
		},
		async (request, reply) => {
			const { controllerId } = request.params;
			const decision = await processAccessAttempt({
				controllerId,
				credentialType: request.body.credentialType,
				credentialValue: request.body.credentialValue,
				requestId: request.body.requestId,
			});

			return reply.status(200).send(decision);
		},
	);

	app.post(
		"/devices/:controllerId/commands",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
				}),
				body: z.object({
					type: commandTypeSchema,
					payload: z.record(z.string(), z.any()).optional(),
					expiresInSeconds: z.number().int().positive().optional(),
				}),
			},
		},
		async (request, reply) => {
			const { controllerId } = request.params;
			const command = await createDoorCommand({
				controllerId,
				type: request.body.type,
				payload: request.body.payload,
				expiresInSeconds: request.body.expiresInSeconds,
			});

			return reply.status(201).send({
				command: {
					id: command.id,
					type: command.type,
					status: command.status,
					payload: command.payload,
					expiresAt: command.expiresAt?.toISOString() ?? null,
					createdAt: command.createdAt.toISOString(),
				},
			});
		},
	);

	app.post(
		"/devices/:controllerId/commands/pull",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
				}),
				body: z
					.object({
						limit: z.number().int().min(1).max(50).optional(),
					})
					.optional(),
			},
		},
		async (request, reply) => {
			const { controllerId } = request.params;
			const limit = request.body?.limit;
			const commands = await pullPendingCommands({
				controllerId,
				limit,
			});

			return reply.status(200).send({
				commands: commands.map((command) => ({
					id: command.id,
					type: command.type,
					status: command.status,
					payload: command.payload,
					expiresAt: command.expiresAt?.toISOString() ?? null,
					sentAt: command.sentAt?.toISOString() ?? null,
				})),
			});
		},
	);

	app.post(
		"/devices/:controllerId/commands/:commandId/ack",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
					commandId: z.string().min(1),
				}),
				body: z.object({
					status: z.union([z.literal("COMPLETED"), z.literal("FAILED")]),
					resultPayload: z
						.record(z.string(), z.any())
						.nullable()
						.optional(),
					errorMessage: z.string().nullable().optional(),
				}),
			},
		},
		async (request, reply) => {
			const { commandId } = request.params;
			const updated = await updateDoorCommandStatus({
				commandId,
				status: request.body.status,
				resultPayload: request.body.resultPayload ?? null,
				errorMessage: request.body.errorMessage ?? null,
			});

			if (!updated) {
				return reply.status(404).send({
					error: "Command not found",
					code: "COMMAND_NOT_FOUND",
				});
			}

			return reply.status(200).send({
				command: {
					id: updated.id,
					status: updated.status,
					processedAt: updated.processedAt?.toISOString() ?? null,
				},
			});
		},
	);
};
