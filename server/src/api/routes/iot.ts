import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { sseBus } from "@/lib/sse-bus";
import type { SchemaWithExamples } from "@/api/openapi";
import {
  accessStatusEnum,
  credentialTypeEnum,
  doorCommandStatusEnum,
  doorCommandTypeEnum,
  doorStateEnum,
  fingerKeyEnum,
} from "@/db/schema/enums";
import { z } from "@/lib/zod";
import { processAccessAttempt } from "@/services/iot/access";
import {
  createDoorCommand,
  pullPendingCommands,
  updateDoorCommandStatus,
} from "@/services/iot/commands";
import {
  recordDoorHeartbeat,
  registerDoorController,
  updateDoorStatus,
} from "@/services/iot/door-controller";
import {
  FingerprintConflictError,
  FingerprintDuplicateTemplateError,
  registerFingerprint,
} from "@/services/user/fingerprint/register-fingerprint";

const doorStateValues = doorStateEnum.enumValues as [
  (typeof doorStateEnum.enumValues)[number],
  ...(typeof doorStateEnum.enumValues)[number][],
];
const doorStateSchema = z.enum(doorStateValues);

const credentialTypeValues = credentialTypeEnum.enumValues as [
  (typeof credentialTypeEnum.enumValues)[number],
  ...(typeof credentialTypeEnum.enumValues)[number][],
];
const credentialTypeSchema = z.enum(credentialTypeValues);

const fingerKeyValues = fingerKeyEnum.enumValues as [
  (typeof fingerKeyEnum.enumValues)[number],
  ...(typeof fingerKeyEnum.enumValues)[number][],
];
const fingerKeySchema = z.enum(fingerKeyValues);

const commandTypeValues = doorCommandTypeEnum.enumValues as [
  (typeof doorCommandTypeEnum.enumValues)[number],
  ...(typeof doorCommandTypeEnum.enumValues)[number][],
];
const commandTypeSchema = z.enum(commandTypeValues);

const commandStatusValues = doorCommandStatusEnum.enumValues as [
  (typeof doorCommandStatusEnum.enumValues)[number],
  ...(typeof doorCommandStatusEnum.enumValues)[number][],
];
const commandStatusSchema = z.enum(commandStatusValues);

const accessStatusValues = accessStatusEnum.enumValues as [
  (typeof accessStatusEnum.enumValues)[number],
  ...(typeof accessStatusEnum.enumValues)[number][],
];
const accessStatusSchema = z.enum(accessStatusValues);

const jsonRecordSchema = z.record(z.string(), z.unknown());

const sensorProtocolValues = ["R30X", "BOLAND"] as const;
const sensorProtocolSchema = z.enum(sensorProtocolValues).nullable();

const controllerSummarySchema = z.object({
  id: z.string(),
  roomId: z.string().uuid(),
  firmwareVersion: z.string().nullable(),
  sensorProtocol: sensorProtocolSchema,
  sensorModel: z.string().nullable(),
  lastSeenAt: z.string().datetime(),
});

const registerControllerResponseSchema = z.object({
  controller: controllerSummarySchema,
});

const roomStateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  doorState: doorStateSchema,
  isLocked: z.boolean().nullable(),
  lastStatusUpdateAt: z.string().datetime().nullable(),
});

const roomStateResponseSchema = z.object({
  room: roomStateSchema,
});

const accessDecisionSchema = z.object({
  status: accessStatusSchema,
  reason: z.string().nullable(),
  user: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      isAdmin: z.boolean(),
    })
    .optional(),
  room: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .optional(),
  requestId: z.string().optional(),
});

const iotCommandSchema = z.object({
  id: z.string().uuid(),
  type: commandTypeSchema,
  status: commandStatusSchema,
  payload: jsonRecordSchema,
  expiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime().optional(),
  sentAt: z.string().datetime().nullable().optional(),
});

const enqueueCommandResponseSchema = z.object({
  command: iotCommandSchema,
});

const pendingCommandsResponseSchema = z.object({
  commands: z.array(iotCommandSchema),
});

const ackCommandResponseSchema = z.object({
  command: z.object({
    id: z.string().uuid(),
    status: z.union([z.literal("COMPLETED"), z.literal("FAILED")]),
    processedAt: z.string().datetime().nullable(),
  }),
});

const sampleControllerId = "controller-lab-101" as const;
const sampleRoomId = "f05c9cd2-3f5f-40bc-9219-028f8f8aaf75" as const;
const sampleCommandId = "6d2dbfb1-9a90-4f49-9af2-6520f9a2c2f5" as const;

const registerControllerResponseExample: z.infer<
  typeof registerControllerResponseSchema
> = {
  controller: {
    id: sampleControllerId,
    roomId: sampleRoomId,
    firmwareVersion: "1.2.3",
    sensorProtocol: "R30X",
    sensorModel: "ZN-53X",
    lastSeenAt: "2025-02-20T14:31:12.000Z",
  },
};

const roomStateResponseExample: z.infer<typeof roomStateResponseSchema> = {
  room: {
    id: sampleRoomId,
    name: "Laboratório 101",
    doorState: "CLOSED",
    isLocked: true,
    lastStatusUpdateAt: "2025-02-20T14:30:00.000Z",
  },
};

const accessDecisionExample: z.infer<typeof accessDecisionSchema> = {
  status: "GRANTED",
  reason: null,
  user: {
    id: "7b3cf58e-353f-48de-b2fd-6f203d64d3f8",
    name: "Ana Souza",
    isAdmin: true,
  },
  room: {
    id: sampleRoomId,
    name: "Laboratório 101",
  },
  requestId: "req-123",
};

const enqueueCommandResponseExample: z.infer<
  typeof enqueueCommandResponseSchema
> = {
  command: {
    id: sampleCommandId,
    type: "UNLOCK",
    status: "PENDING",
    payload: { durationSeconds: 30 },
    expiresAt: "2025-02-20T15:00:00.000Z",
    createdAt: "2025-02-20T14:58:00.000Z",
    sentAt: null,
  },
};

const pendingCommandsResponseExample: z.infer<
  typeof pendingCommandsResponseSchema
> = {
  commands: [
    {
      id: sampleCommandId,
      type: "UNLOCK",
      status: "SENT",
      payload: { durationSeconds: 30 },
      expiresAt: "2025-02-20T15:00:00.000Z",
      createdAt: "2025-02-20T14:58:00.000Z",
      sentAt: "2025-02-20T14:58:05.000Z",
    },
  ],
};

const ackCommandResponseExample: z.infer<typeof ackCommandResponseSchema> = {
  command: {
    id: sampleCommandId,
    status: "COMPLETED",
    processedAt: "2025-02-20T14:58:30.000Z",
  },
};

export const iotRoute: FastifyPluginAsyncZod = async (app) => {
  app.put(
    "/devices/:controllerId",
    {
      schema: {
        params: z.object({
          controllerId: z.string().min(1),
        }),
        body: z.object({
          roomId: z.string().min(1),
          firmwareVersion: z.string().min(1).optional(),
          sensorProtocol: z.enum(sensorProtocolValues).optional(),
          sensorModel: z.string().min(1).optional(),
        }),
        tags: ["iot"],
        summary: "Registrar ou atualizar controlador",
        description:
          "Usado pelo dispositivo IoT para criar ou atualizar seu cadastro junto à API usando PUT idempotente.",
        response: {
          200: registerControllerResponseSchema,
        },
        paramsExample: {
          controllerId: sampleControllerId,
        },
        bodyExample: {
          roomId: sampleRoomId,
          firmwareVersion: "1.2.3",
          sensorProtocol: "R30X",
          sensorModel: "ZN-53X",
        },
        responseExamples: {
          200: registerControllerResponseExample,
        },
      } satisfies SchemaWithExamples,
    },
    async (request, reply) => {
      const { controllerId } = request.params;
      const { roomId, firmwareVersion, sensorProtocol, sensorModel } =
        request.body;
      const result = await registerDoorController({
        controllerId,
        roomId,
        firmwareVersion,
        sensorProtocol,
        sensorModel,
      });
      const payload: z.infer<typeof registerControllerResponseSchema> = {
        controller: {
          id: result.controller.id,
          roomId: result.controller.roomId,
          firmwareVersion: result.controller.firmwareVersion,
          sensorProtocol:
            (result.controller.sensorProtocol as
              | (typeof sensorProtocolValues)[number]
              | null) ?? null,
          sensorModel: result.controller.sensorModel ?? null,
          lastSeenAt: result.controller.lastSeenAt.toISOString(),
        },
      };
      return reply.status(200).send(payload);
    },
  );

  app.patch(
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
        tags: ["iot"],
        summary: "Heartbeat do controlador",
        description:
          "Atualiza o timestamp de últimos sinais de vida do dispositivo e opcionalmente a versão do firmware.",
        response: {
          200: registerControllerResponseSchema,
          404: z.object({
            error: z.literal("Controller not registered"),
            code: z.literal("CONTROLLER_NOT_FOUND"),
          }),
        },
        paramsExample: {
          controllerId: sampleControllerId,
        },
        bodyExample: {
          firmwareVersion: "1.2.4",
        },
        responseExamples: {
          200: registerControllerResponseExample,
          404: {
            error: "Controller not registered",
            code: "CONTROLLER_NOT_FOUND",
          },
        },
      } satisfies SchemaWithExamples,
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

      const payload: z.infer<typeof registerControllerResponseSchema> = {
        controller: {
          id: controller.id,
          roomId: controller.roomId,
          firmwareVersion: controller.firmwareVersion,
          sensorProtocol:
            (controller.sensorProtocol as
              | (typeof sensorProtocolValues)[number]
              | null) ?? null,
          sensorModel: controller.sensorModel ?? null,
          lastSeenAt: controller.lastSeenAt.toISOString(),
        },
      };

      return reply.status(200).send(payload);
    },
  );

  app.put(
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
        tags: ["iot"],
        summary: "Atualizar status da porta",
        description:
          "Persistir o estado atual detectado pelo controlador (fechada/aberta, trancada/destrancada).",
        response: {
          200: roomStateResponseSchema,
          404: z.object({
            error: z.literal("Controller not registered"),
            code: z.literal("CONTROLLER_NOT_FOUND"),
          }),
        },
        paramsExample: {
          controllerId: sampleControllerId,
        },
        bodyExample: {
          doorState: "CLOSED",
          isLocked: true,
          firmwareVersion: "1.2.4",
        },
        responseExamples: {
          200: roomStateResponseExample,
          404: {
            error: "Controller not registered",
            code: "CONTROLLER_NOT_FOUND",
          },
        },
      } satisfies SchemaWithExamples,
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

      const payload: z.infer<typeof roomStateResponseSchema> = {
        room: {
          id: room.id,
          name: room.name,
          doorState: room.doorState,
          isLocked: room.isLocked,
          lastStatusUpdateAt: room.lastStatusUpdateAt?.toISOString() ?? null,
        },
      };

      sseBus.publishRoomStatus({
        roomId: room.id,
        doorState: room.doorState,
        isLocked: room.isLocked,
        lastStatusUpdateAt: room.lastStatusUpdateAt?.toISOString() ?? null,
      });

      return reply.status(200).send(payload);
    },
  );

  app.post(
    "/devices/:controllerId/access-attempts",
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
        tags: ["iot"],
        summary: "Registrar tentativa de acesso",
        description:
          "Avalia uma credencial apresentada ao controlador e retorna a decisão (permitido ou negado).",
        response: {
          200: accessDecisionSchema,
        },
        paramsExample: {
          controllerId: sampleControllerId,
        },
        bodyExample: {
          credentialType: "NFC_TAG",
          credentialValue: "AB:CD:EF:12",
          requestId: "req-123",
        },
        responseExamples: {
          200: accessDecisionExample,
        },
      } satisfies SchemaWithExamples,
    },
    async (request, reply) => {
      const { controllerId } = request.params;
      const decision = await processAccessAttempt({
        controllerId,
        credentialType: request.body.credentialType,
        credentialValue: request.body.credentialValue,
        requestId: request.body.requestId,
      });

      const payload: z.infer<typeof accessDecisionSchema> = {
        status: decision.status,
        reason: decision.reason,
        room: decision.room,
        user: decision.user,
        requestId: decision.requestId,
      };
      return reply.status(200).send(payload);
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
          payload: jsonRecordSchema.optional(),
          expiresInSeconds: z.number().int().positive().optional(),
        }),
        tags: ["iot"],
        summary: "Criar comando emergencial",
        description:
          "Permite que o controlador solicite um comando imediato (por exemplo, destravar temporariamente a porta).",
        response: {
          201: enqueueCommandResponseSchema,
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
          201: enqueueCommandResponseExample,
        },
      } satisfies SchemaWithExamples,
    },
    async (request, reply) => {
      const { controllerId } = request.params;
      const command = await createDoorCommand({
        controllerId,
        type: request.body.type,
        payload: request.body.payload,
        expiresInSeconds: request.body.expiresInSeconds,
      });

      const payload: z.infer<typeof enqueueCommandResponseSchema> = {
        command: {
          id: command.id,
          type: command.type,
          status: command.status,
          payload: command.payload,
          expiresAt: command.expiresAt?.toISOString() ?? null,
          createdAt: command.createdAt.toISOString(),
        },
      };
      return reply.status(201).send(payload);
    },
  );

  app.get(
    "/devices/:controllerId/commands",
    {
      schema: {
        params: z.object({
          controllerId: z.string().min(1),
        }),
        querystring: z.object({
          limit: z.coerce.number().int().min(1).max(50).optional(),
        }),
        tags: ["iot"],
        summary: "Buscar comandos pendentes",
        description:
          "Entrega ao controlador os comandos na fila que ainda não foram enviados ou expirados.",
        response: {
          200: pendingCommandsResponseSchema,
        },
        paramsExample: {
          controllerId: sampleControllerId,
        },
        querystringExample: {
          limit: 5,
        },
        responseExamples: {
          200: pendingCommandsResponseExample,
        },
      } satisfies SchemaWithExamples,
    },
    async (request, reply) => {
      const { controllerId } = request.params;
      const limit = request.query.limit;
      const commands = await pullPendingCommands({
        controllerId,
        limit,
      });

      const payload: z.infer<typeof pendingCommandsResponseSchema> = {
        commands: commands.map((command) => ({
          id: command.id,
          type: command.type,
          status: command.status,
          payload: command.payload,
          expiresAt: command.expiresAt?.toISOString() ?? null,
          sentAt: command.sentAt?.toISOString() ?? null,
        })),
      };
      return reply.status(200).send(payload);
    },
  );

  // POST /iot/devices/:controllerId/enrollment
  // Rota interna chamada pelo broker MQTT após receber enrollment/{id}/result
  // Não exige sessão — o contexto de autenticação é o controllerId registrado no banco
  app.post(
    "/devices/:controllerId/enrollment",
    {
      schema: {
        params: z.object({
          controllerId: z.string().min(1),
        }),
        body: z.object({
          userId: z.string().uuid(),
          finger: fingerKeySchema,
          template: z.string().min(1),
          enrollmentId: z.string().min(1).optional(),
        }),
        tags: ["iot"],
        summary: "Registrar digital via terminal de enrollment",
        description:
          "Endpoint interno chamado pelo broker MQTT ao processar o resultado de enrollment biométrico capturado por um controlador físico. Não exige cookie de sessão — autenticado pelo controllerId.",
        response: {
          201: z.object({
            id: z.string().uuid(),
            finger: fingerKeySchema,
            isActive: z.boolean(),
            createdAt: z.string().datetime(),
          }),
          409: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
        },
        paramsExample: {
          controllerId: sampleControllerId,
        },
        bodyExample: {
          userId: "7b3cf58e-353f-48de-b2fd-6f203d64d3f8",
          finger: "right_index",
          template: "4152010000000000...",
          enrollmentId: "enroll-abc-123",
        },
      } satisfies SchemaWithExamples,
    },
    async (request, reply) => {
      const { controllerId } = request.params;
      const { userId, finger, template, enrollmentId } = request.body;

      try {
        const record = await registerFingerprint({
          userId,
          finger,
          template,
          enrolledByControllerId: controllerId,
        });

        request.log.info(
          { controllerId, userId, finger, enrollmentId },
          "Fingerprint registered via MQTT enrollment",
        );

        return reply.status(201).send({
          ...record,
          createdAt: record.createdAt.toISOString(),
        });
      } catch (err) {
        if (
          err instanceof FingerprintConflictError ||
          err instanceof FingerprintDuplicateTemplateError
        ) {
          return reply.status(409).send({ message: (err as Error).message });
        }
        throw err;
      }
    },
  );

  app.patch(
    "/devices/:controllerId/commands/:commandId/ack",
    {
      schema: {
        params: z.object({
          controllerId: z.string().min(1),
          commandId: z.string().min(1),
        }),
        body: z.object({
          status: z.union([z.literal("COMPLETED"), z.literal("FAILED")]),
          resultPayload: jsonRecordSchema.nullable().optional(),
          errorMessage: z.string().nullable().optional(),
        }),
        tags: ["iot"],
        summary: "Confirmar execução de comando",
        description:
          "Atualiza o status de um comando após processamento pelo controlador, incluindo payload de resultado ou erro.",
        response: {
          200: ackCommandResponseSchema,
          404: z.object({
            error: z.literal("Command not found"),
            code: z.literal("COMMAND_NOT_FOUND"),
          }),
        },
        paramsExample: {
          controllerId: sampleControllerId,
          commandId: sampleCommandId,
        },
        bodyExample: {
          status: "COMPLETED",
          resultPayload: { doorState: "UNLOCKED" },
          errorMessage: null,
        },
        responseExamples: {
          200: ackCommandResponseExample,
          404: {
            error: "Command not found",
            code: "COMMAND_NOT_FOUND",
          },
        },
      } satisfies SchemaWithExamples,
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

      const payload: z.infer<typeof ackCommandResponseSchema> = {
        command: {
          id: updated.id,
          status: updated.status as "COMPLETED" | "FAILED",
          processedAt: updated.processedAt?.toISOString() ?? null,
        },
      };

      return reply.status(200).send(payload);
    },
  );
};
