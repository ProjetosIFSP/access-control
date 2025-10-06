import { db } from "@/db";
import { doorCommand } from "@/db/schema/door";
import {
	doorCommandStatusEnum,
	doorCommandTypeEnum,
} from "@/db/schema/enums";
import { and, asc, eq, inArray } from "drizzle-orm";

const COMMAND_TYPES = doorCommandTypeEnum.enumValues;
const COMMAND_STATUSES = doorCommandStatusEnum.enumValues;

type DoorCommandType = (typeof COMMAND_TYPES)[number];
type DoorCommandStatus = (typeof COMMAND_STATUSES)[number];

interface CreateDoorCommandInput {
	controllerId: string;
	type: DoorCommandType;
	payload?: Record<string, unknown>;
	expiresInSeconds?: number;
}

export async function createDoorCommand(
	input: CreateDoorCommandInput,
) {
	const { controllerId, type, payload, expiresInSeconds } = input;
	const expiresAt =
		type === "UNLOCK" && !expiresInSeconds
			? new Date(Date.now() + 30_000)
			: expiresInSeconds
				? new Date(Date.now() + expiresInSeconds * 1_000)
				: null;

	const [command] = await db
		.insert(doorCommand)
		.values({
			controllerId,
			type,
			payload: (payload ?? {}) as Record<string, unknown>,
			expiresAt,
		})
		.returning();

	return command;
}

interface PullPendingCommandsInput {
	controllerId: string;
	limit?: number;
}

export async function pullPendingCommands(
	input: PullPendingCommandsInput,
) {
	const { controllerId, limit = 10 } = input;
	const now = new Date();

	return await db.transaction(async (tx) => {
		const commands = await tx
			.select({
				id: doorCommand.id,
				type: doorCommand.type,
				status: doorCommand.status,
				payload: doorCommand.payload,
				expiresAt: doorCommand.expiresAt,
			})
			.from(doorCommand)
			.where(
				and(
					eq(doorCommand.controllerId, controllerId),
					eq(doorCommand.status, "PENDING"),
				),
			)
			.orderBy(asc(doorCommand.createdAt))
			.limit(limit);

		const expiredIds: string[] = [];
		const activeCommands = [] as typeof commands;

		for (const command of commands) {
			if (command.expiresAt && command.expiresAt.getTime() <= now.getTime()) {
				expiredIds.push(command.id);
			} else {
				activeCommands.push(command);
			}
		}

		if (expiredIds.length > 0) {
			await tx
				.update(doorCommand)
				.set({
					status: "EXPIRED",
					processedAt: now,
					updatedAt: now,
				})
				.where(inArray(doorCommand.id, expiredIds));
		}

		if (activeCommands.length === 0) {
			return [];
		}

		const activeIds = activeCommands.map((command) => command.id);

		await tx
			.update(doorCommand)
			.set({
				status: "SENT",
				sentAt: now,
				updatedAt: now,
			})
			.where(inArray(doorCommand.id, activeIds));

		return activeCommands.map((command) => ({
			...command,
			status: "SENT" as DoorCommandStatus,
			sentAt: now,
		}));
	});
}

interface UpdateDoorCommandStatusInput {
	commandId: string;
	status: Extract<DoorCommandStatus, "COMPLETED" | "FAILED">;
	resultPayload?: Record<string, unknown> | null;
	errorMessage?: string | null;
}

export async function updateDoorCommandStatus(
	input: UpdateDoorCommandStatusInput,
) {
	const { commandId, status, resultPayload, errorMessage } = input;
	const now = new Date();

	const [command] = await db
		.update(doorCommand)
		.set({
			status,
			processedAt: now,
			updatedAt: now,
			resultPayload: resultPayload ?? null,
			errorMessage: errorMessage ?? null,
		})
		.where(eq(doorCommand.id, commandId))
		.returning();

	return command;
}
