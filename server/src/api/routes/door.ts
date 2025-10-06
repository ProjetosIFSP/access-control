import { doorCommandTypeEnum } from "@/db/schema/enums";
import { createDoorCommand } from "@/services/iot/commands";
import { getControllerAccessLogs } from "@/services/iot/get-controller-access-logs";
import { getControllerCommands } from "@/services/iot/get-controller-commands";
import { getDoorControllers } from "@/services/iot/get-door-controllers";
import { getDoorControllerById } from "@/services/iot/door-controller";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import z from "zod";

const commandTypeValues = doorCommandTypeEnum.enumValues as [
	typeof doorCommandTypeEnum.enumValues[number],
	...typeof doorCommandTypeEnum.enumValues[number][],
];
const commandTypeSchema = z.enum(commandTypeValues);

export const doorRoute: FastifyPluginAsyncZod = async (app) => {
	app.get("/", async (_request, reply) => {
		const controllers = await getDoorControllers();
		return reply.status(200).send({ controllers });
	});

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
			},
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
			return reply.status(200).send({ commands });
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
					payload: z.record(z.string(), z.any()).optional(),
					expiresInSeconds: z.number().int().positive().optional(),
				}),
			},
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

			return reply.status(201).send({ command });
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
			},
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

			return reply.status(200).send(logs);
		},
	);
};
