import {
	accessStatusEnum,
	doorCommandStatusEnum,
	doorCommandTypeEnum,
	doorStateEnum,
} from "@/db/schema/enums";
import { createDoorCommand } from "@/services/iot/commands";
import { getControllerAccessLogs } from "@/services/iot/get-controller-access-logs";
import { getControllerCommands } from "@/services/iot/get-controller-commands";
import { getDoorControllers } from "@/services/iot/get-door-controllers";
import { getDoorControllerById } from "@/services/iot/door-controller";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "@/lib/zod";
import type { SchemaWithExamples } from "@/api/openapi";

const commandTypeValues = doorCommandTypeEnum.enumValues as [
	typeof doorCommandTypeEnum.enumValues[number],
	...typeof doorCommandTypeEnum.enumValues[number][],
];
const commandTypeSchema = z.enum(commandTypeValues);

const commandStatusValues = doorCommandStatusEnum.enumValues as [
	typeof doorCommandStatusEnum.enumValues[number],
	...typeof doorCommandStatusEnum.enumValues[number][],
];
const commandStatusSchema = z.enum(commandStatusValues);

const doorStateValues = doorStateEnum.enumValues as [
	typeof doorStateEnum.enumValues[number],
	...typeof doorStateEnum.enumValues[number][],
];
const doorStateSchema = z.enum(doorStateValues);

const accessStatusValues = accessStatusEnum.enumValues as [
	typeof accessStatusEnum.enumValues[number],
	...typeof accessStatusEnum.enumValues[number][],
];
const accessStatusSchema = z.enum(accessStatusValues);

const jsonRecordSchema = z.record(z.string(), z.unknown());

const doorCommandDetailSchema = z.object({
	id: z.string().uuid(),
	type: commandTypeSchema,
	status: commandStatusSchema,
	payload: jsonRecordSchema,
	resultPayload: jsonRecordSchema.nullable(),
	errorMessage: z.string().nullable(),
	expiresAt: z.string().datetime().nullable(),
	sentAt: z.string().datetime().nullable(),
	processedAt: z.string().datetime().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

const doorCommandSummarySchema = z.object({
	id: z.string().uuid(),
	type: commandTypeSchema,
	status: commandStatusSchema,
	createdAt: z.string().datetime(),
	sentAt: z.string().datetime().nullable(),
	processedAt: z.string().datetime().nullable(),
});

const doorControllerSummarySchema = z.object({
	controllerId: z.string(),
	room: z.object({
		id: z.string().uuid(),
		name: z.string(),
		blockName: z.string(),
		doorState: doorStateSchema,
		isLocked: z.boolean().nullable(),
		lastStatusUpdateAt: z.string().datetime().nullable(),
	}),
	controller: z.object({
		firmwareVersion: z.string().nullable(),
		lastSeenAt: z.string().datetime(),
	}),
	lastCommand: doorCommandSummarySchema.nullable(),
});

const listDoorControllersResponseSchema = z.object({
	controllers: z.array(doorControllerSummarySchema),
});

const controllerCommandsResponseSchema = z.object({
	commands: z.array(doorCommandDetailSchema),
});

const createCommandResponseSchema = z.object({
	command: doorCommandDetailSchema,
});

const accessLogEntrySchema = z.object({
	id: z.string().uuid(),
	status: accessStatusSchema,
	reason: z.string().nullable(),
	timestamp: z.string().datetime(),
	userId: z.string().uuid().nullable(),
	credentialId: z.string().uuid().nullable(),
	credentialValueUsed: z.string().nullable(),
	userName: z.string().nullable(),
});

const controllerAccessLogsResponseSchema = z.object({
	roomId: z.string().uuid(),
	logs: z.array(accessLogEntrySchema),
});

const sampleControllerId = "controller-lab-101" as const;
const sampleRoomId = "f05c9cd2-3f5f-40bc-9219-028f8f8aaf75" as const;
const sampleCommandId = "6d2dbfb1-9a90-4f49-9af2-6520f9a2c2f5" as const;

const listDoorControllersResponseExample: z.infer<
	typeof listDoorControllersResponseSchema
> = {
	controllers: [
		{
			controllerId: sampleControllerId,
			room: {
				id: sampleRoomId,
				name: "Laboratório 101",
				blockName: "Prédio Principal",
				doorState: "CLOSED",
				isLocked: true,
				lastStatusUpdateAt: "2025-02-20T14:30:00.000Z",
			},
			controller: {
				firmwareVersion: "1.2.3",
				lastSeenAt: "2025-02-20T14:31:12.000Z",
			},
			lastCommand: {
				id: sampleCommandId,
				type: "LOCK",
				status: "SENT",
				createdAt: "2025-02-20T14:29:45.000Z",
				sentAt: "2025-02-20T14:29:50.000Z",
				processedAt: null,
			},
		},
	],
};

const controllerCommandsResponseExample: z.infer<
	typeof controllerCommandsResponseSchema
> = {
	commands: [
		{
			id: sampleCommandId,
			type: "LOCK",
			status: "SENT",
			payload: { source: "dashboard" },
			resultPayload: null,
			errorMessage: null,
			expiresAt: "2025-02-20T14:35:00.000Z",
			sentAt: "2025-02-20T14:29:50.000Z",
			processedAt: null,
			createdAt: "2025-02-20T14:29:45.000Z",
			updatedAt: "2025-02-20T14:29:50.000Z",
		},
	],
};

const createCommandResponseExample: z.infer<
	typeof createCommandResponseSchema
> = {
	command: {
		id: "4f3b9a8d-4fef-4e57-9f02-d7d2bf6a73c2",
		type: "UNLOCK",
		status: "PENDING",
		payload: { durationSeconds: 30 },
		resultPayload: null,
		errorMessage: null,
		expiresAt: "2025-02-20T15:00:00.000Z",
		sentAt: null,
		processedAt: null,
		createdAt: "2025-02-20T14:58:00.000Z",
		updatedAt: "2025-02-20T14:58:00.000Z",
	},
};

const controllerAccessLogsResponseExample: z.infer<
	typeof controllerAccessLogsResponseSchema
> = {
	roomId: sampleRoomId,
	logs: [
		{
			id: "b8a2847c-48c1-4e4e-8f90-b63c7ec5d8f3",
			status: "GRANTED",
			reason: null,
			timestamp: "2025-02-20T14:25:10.000Z",
			userId: "7b3cf58e-353f-48de-b2fd-6f203d64d3f8",
			credentialId: "9858ab19-c4b0-47aa-867f-2c569c114541",
			credentialValueUsed: "A1:B2:C3:D4",
			userName: "Ana Souza",
		},
		{
			id: "66f9f2e8-7d54-4c74-889b-255591f4142f",
			status: "DENIED",
			reason: "NO_PERMISSION",
			timestamp: "2025-02-20T10:02:36.000Z",
			userId: null,
			credentialId: null,
			credentialValueUsed: "FF:EE:DD:CC",
			userName: null,
		},
	],
};

const controllerNotFoundExample = {
	error: "Controller not found" as const,
	code: "CONTROLLER_NOT_FOUND" as const,
};

export const doorRoute: FastifyPluginAsyncZod = async (app) => {
	app.get(
		"/",
		{
			schema: {
				tags: ["doors"],
				summary: "Listar controladores de porta",
				description:
					"Retorna todos os controladores físicos cadastrados, status atual e último comando enviado.",
				security: [{ sessionCookie: [] }],
				response: {
					200: listDoorControllersResponseSchema,
				},
				responseExamples: {
					200: listDoorControllersResponseExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (_request, reply) => {
			const controllers = await getDoorControllers();
			const payload: z.infer<typeof listDoorControllersResponseSchema> = {
				controllers: controllers.map((controller) => ({
					controllerId: controller.controllerId,
					room: {
						...controller.room,
						lastStatusUpdateAt:
							controller.room.lastStatusUpdateAt?.toISOString() ?? null,
					},
					controller: {
						firmwareVersion: controller.controller.firmwareVersion,
						lastSeenAt: controller.controller.lastSeenAt.toISOString(),
					},
					lastCommand: controller.lastCommand
						? {
							id: controller.lastCommand.id,
							type: controller.lastCommand.type,
							status: controller.lastCommand.status,
							createdAt: controller.lastCommand.createdAt.toISOString(),
							sentAt: controller.lastCommand.sentAt?.toISOString() ?? null,
							processedAt:
								controller.lastCommand.processedAt?.toISOString() ?? null,
						}
						: null,
				})),
			};
			return reply.status(200).send(payload);
		},
	);

	app.get(
		"/:controllerId/commands",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
				}),
				querystring: z.object({
					limit: z.coerce.number().int().min(1).max(100).optional(),
				}),
				tags: ["doors"],
				summary: "Histórico de comandos",
				description: "Consulta os comandos emitidos para um controlador específico.",
				security: [{ sessionCookie: [] }],
				response: {
					200: controllerCommandsResponseSchema,
					404: z.object({
						error: z.literal("Controller not found"),
						code: z.literal("CONTROLLER_NOT_FOUND"),
					}),
				},
				paramsExample: {
					controllerId: sampleControllerId,
				},
				querystringExample: {
					limit: 20,
				},
				responseExamples: {
					200: controllerCommandsResponseExample,
					404: controllerNotFoundExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (request, reply) => {
			const { controllerId } = request.params;
			const limit = request.query.limit;
			const controller = await getDoorControllerById(controllerId);
			if (!controller) {
				return reply.status(404).send({
					error: "Controller not found",
					code: "CONTROLLER_NOT_FOUND",
				});
			}

			const { commands } = await getControllerCommands(controllerId, { limit });
			const payload: z.infer<typeof controllerCommandsResponseSchema> = {
				commands: commands.map((command) => ({
					id: command.id,
					type: command.type,
					status: command.status,
					payload: command.payload,
					resultPayload: command.resultPayload ?? null,
					errorMessage: command.errorMessage ?? null,
					expiresAt: command.expiresAt?.toISOString() ?? null,
					sentAt: command.sentAt?.toISOString() ?? null,
					processedAt: command.processedAt?.toISOString() ?? null,
					createdAt: command.createdAt.toISOString(),
					updatedAt: command.updatedAt.toISOString(),
				})),
			};
			return reply.status(200).send(payload);
		},
	);

	app.post(
		"/:controllerId/commands",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
				}),
				body: z.object({
					type: commandTypeSchema,
					payload: z.record(z.string(), z.unknown()).optional(),
					expiresInSeconds: z.number().int().positive().optional(),
				}),
				tags: ["doors"],
				summary: "Enviar comando para controlador",
				description:
					"Agenda um novo comando administrativo (trava, destrava, sincronização de estado) para o controlador informado.",
				security: [{ sessionCookie: [] }],
				response: {
					201: createCommandResponseSchema,
					404: z.object({
						error: z.literal("Controller not found"),
						code: z.literal("CONTROLLER_NOT_FOUND"),
					}),
				},
				paramsExample: {
					controllerId: sampleControllerId,
				},
				bodyExample: {
					type: "UNLOCK",
					payload: { durationSeconds: 30 },
					expiresInSeconds: 60,
				},
				responseExamples: {
					201: createCommandResponseExample,
					404: controllerNotFoundExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (request, reply) => {
			const { controllerId } = request.params;
			const controller = await getDoorControllerById(controllerId);
			if (!controller) {
				return reply.status(404).send({
					error: "Controller not found",
					code: "CONTROLLER_NOT_FOUND",
				});
			}

			const command = await createDoorCommand({
				controllerId,
				type: request.body.type,
				payload: request.body.payload,
				expiresInSeconds: request.body.expiresInSeconds,
			});

			const payload: z.infer<typeof createCommandResponseSchema> = {
				command: {
					id: command.id,
					type: command.type,
					status: command.status,
					payload: command.payload,
					resultPayload: command.resultPayload ?? null,
					errorMessage: command.errorMessage ?? null,
					expiresAt: command.expiresAt?.toISOString() ?? null,
					sentAt: command.sentAt?.toISOString() ?? null,
					processedAt: command.processedAt?.toISOString() ?? null,
					createdAt: command.createdAt.toISOString(),
					updatedAt: command.updatedAt.toISOString(),
				},
			};
			return reply.status(201).send(payload);
		},
	);

	app.get(
		"/:controllerId/access-logs",
		{
			schema: {
				params: z.object({
					controllerId: z.string().min(1),
				}),
				querystring: z.object({
					limit: z.coerce.number().int().min(1).max(200).optional(),
				}),
				tags: ["doors"],
				summary: "Consultar logs de acesso",
				description:
					"Retorna o histórico recente de tentativas de acesso registradas para a sala vinculada ao controlador.",
				security: [{ sessionCookie: [] }],
				response: {
					200: controllerAccessLogsResponseSchema,
					404: z.object({
						error: z.literal("Controller not found"),
						code: z.literal("CONTROLLER_NOT_FOUND"),
					}),
				},
				paramsExample: {
					controllerId: sampleControllerId,
				},
				querystringExample: {
					limit: 50,
				},
				responseExamples: {
					200: controllerAccessLogsResponseExample,
					404: controllerNotFoundExample,
				},
			} satisfies SchemaWithExamples,
		},
		async (request, reply) => {
			const { controllerId } = request.params;
			const limit = request.query.limit;
			const logs = await getControllerAccessLogs(controllerId, { limit });

			if (!logs) {
				return reply.status(404).send({
					error: "Controller not found",
					code: "CONTROLLER_NOT_FOUND",
				});
			}

			const payload: z.infer<typeof controllerAccessLogsResponseSchema> = {
				roomId: logs.roomId,
				logs: logs.logs.map((log) => ({
					...log,
					timestamp: log.timestamp.toISOString(),
				})),
			};

			return reply.status(200).send(payload);
		},
	);
};
