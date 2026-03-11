import dayjs from "dayjs";
import { client, db } from ".";
import { user } from "./schema/auth";
import { block, doorController, room, roomType } from "./schema/room";

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOW = dayjs();

function minutesAgo(n: number): Date {
	return new Date(NOW.toDate().getTime() - n * 60 * 1000);
}
function hoursAgo(n: number): Date {
	return new Date(NOW.toDate().getTime() - n * 60 * 60 * 1000);
}
function daysAgo(n: number): Date {
	return new Date(NOW.toDate().getTime() - n * 24 * 60 * 60 * 1000);
}

// ── Pools ─────────────────────────────────────────────────────────────────────

type DoorState = "OPEN" | "CLOSED" | "UNKNOWN";

const statePool: { doorState: DoorState; isLocked: boolean }[] = [
	{ doorState: "OPEN", isLocked: false }, // aberta
	{ doorState: "CLOSED", isLocked: false }, // fechada
	{ doorState: "CLOSED", isLocked: false }, // fechada
	{ doorState: "OPEN", isLocked: false }, // aberta
	{ doorState: "CLOSED", isLocked: true }, // fechada
	{ doorState: "UNKNOWN", isLocked: false }, // alerta
	{ doorState: "OPEN", isLocked: false }, // aberta
	{ doorState: "CLOSED", isLocked: false }, // fechada
	{ doorState: "OPEN", isLocked: true }, // alerta
	{ doorState: "CLOSED", isLocked: false }, // fechada
	{ doorState: "OPEN", isLocked: false }, // aberta
	{ doorState: "UNKNOWN", isLocked: false }, // alerta
	{ doorState: "CLOSED", isLocked: false }, // fechada
	{ doorState: "OPEN", isLocked: false }, // aberta
	{ doorState: "CLOSED", isLocked: true }, // fechada
];

// null = sem registro de uso
const timestampPool: (Date | null)[] = [
	minutesAgo(4),
	minutesAgo(17),
	minutesAgo(45),
	hoursAgo(1),
	hoursAgo(2),
	hoursAgo(3),
	hoursAgo(5),
	hoursAgo(8),
	hoursAgo(12),
	hoursAgo(24),
	daysAgo(2),
	daysAgo(3),
	daysAgo(5),
	daysAgo(7),
	daysAgo(14),
	daysAgo(30),
	daysAgo(60),
	null,
	null,
	null,
];

// ── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
	await db.delete(room);
	await db.delete(roomType);
	await db.delete(block);
	await db.delete(user);

	// ── Users ─────────────────────────────────────────────────────────────────

	await db.insert(user).values([
		{
			name: "Admin User",
			email: "admin@ifsp.edu.br",
			emailVerified: true,
			isAdmin: true,
		},
	]);

	// ── Blocks ────────────────────────────────────────────────────────────────

	const blockReturning = await db
		.insert(block)
		.values([
			{ name: "Bloco A" },
			{ name: "Bloco B" },
			{ name: "Bloco C" },
			{ name: "Bloco D" },
		])
		.returning();

	// ── Room Types ────────────────────────────────────────────────────────────

	const roomTypeReturning = await db
		.insert(roomType)
		.values([
			{ name: "Sala de Aula", abbreviation: "SALA" },
			{ name: "Laboratório de Informática", abbreviation: "LINF" },
			{ name: "Laboratório de Eletrônica", abbreviation: "LELE" },
			{ name: "Laboratório de Química", abbreviation: "LQUI" },
			{ name: "Sala de Reunião", abbreviation: "REUN" },
			{ name: "Coordenação", abbreviation: "COOR" },
			{ name: "Sala de Professores", abbreviation: "PROF" },
			{ name: "Biblioteca", abbreviation: "BIBL" },
			{ name: "Almoxarifado", abbreviation: "ALMX" },
		])
		.returning();

	// ── Rooms ─────────────────────────────────────────────────────────────────
	// Pattern: {BlockLetter}{Floor}{RoomNumber}
	// 4 blocks × 2 floors × 11 rooms = 88 rooms total (≥ 20 per block)

	const blockLetters = ["A", "B", "C", "D"];
	const floors = [1, 2];
	// 11 rooms per floor → 22 per block
	const roomsPerFloor = Array.from({ length: 11 }, (_, i) =>
		String(i + 1).padStart(2, "0"),
	);

	type RoomInsert = {
		name: string;
		blockId: string;
		typeId: string;
		doorState: DoorState;
		isLocked: boolean;
		lastStatusUpdateAt: Date | null;
	};

	const rooms: RoomInsert[] = [];
	let idx = 0;

	for (let blockIdx = 0; blockIdx < blockLetters.length; blockIdx++) {
		const letter = blockLetters[blockIdx];
		const blockId = blockReturning[blockIdx].id;

		for (const floor of floors) {
			for (const num of roomsPerFloor) {
				const name = `${letter}${floor}${num}`;
				const state = statePool[idx % statePool.length];
				const typeId = roomTypeReturning[idx % roomTypeReturning.length].id;
				const lastStatusUpdateAt = timestampPool[idx % timestampPool.length];

				rooms.push({
					name,
					blockId,
					typeId,
					doorState: state.doorState,
					isLocked: state.isLocked,
					lastStatusUpdateAt,
				});

				idx++;
			}
		}
	}

	const roomReturning = await db.insert(room).values(rooms).returning();

	// ── Door Controllers ──────────────────────────────────────────────────────
	// Simula controladores físicos instalados nas primeiras salas de cada bloco.
	// Em produção, os controladores se auto-registram via MQTT ao inicializar.

	const controllerSeeds: {
		id: string;
		roomId: string;
		sensorProtocol: "R30X" | "BOLAND";
		sensorModel: string;
		firmwareVersion: string;
		lastSeenAt: Date;
	}[] = [];

	// Instala um controlador nas 3 primeiras salas de cada bloco (12 no total)
	const roomsPerBlock = rooms.length / blockReturning.length; // 22 por bloco
	for (let b = 0; b < blockReturning.length; b++) {
		for (let r = 0; r < 3; r++) {
			const roomIndex = b * roomsPerBlock + r;
			const roomRecord = roomReturning[roomIndex];
			if (!roomRecord) continue;

			const minutesOffset = b * 3 + r;
			controllerSeeds.push({
				id: `esp32-${blockLetters[b].toLowerCase()}${String(r + 1).padStart(2, "0")}`,
				roomId: roomRecord.id,
				sensorProtocol: "R30X",
				sensorModel: "ZN-53X",
				firmwareVersion: "1.0.0",
				lastSeenAt: minutesAgo(minutesOffset + 1),
			});
		}
	}

	if (controllerSeeds.length > 0) {
		await db.insert(doorController).values(controllerSeeds);
	}

	console.log(
		`✅ Seed concluído: ${rooms.length} salas em ${blockReturning.length} blocos, ${controllerSeeds.length} controladores instalados.`,
	);
}

seed().finally(() => {
	client.end();
});
