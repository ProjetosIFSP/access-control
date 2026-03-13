import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { fn } from "storybook/test";
import { RoomDrawer } from "@/components/rooms/room-drawer";
import { roomsQueryKeys } from "@/services/rooms";
import type {
	RoomAccessLogsResponse,
	RoomSummaryItem,
} from "@/services/rooms/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const now = new Date();
const hoursAgo = (h: number) =>
	new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) =>
	new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

const roomAberta: RoomSummaryItem = {
	id: "room-aberta",
	name: "A205",
	typeAbbreviation: "LQUI",
	state: "aberta",
	lastStatusUpdateAt: hoursAgo(1),
	currentUser: null,
	lastUser: {
		id: "u1",
		name: "Kevin James",
		email: "kevin.james@ifsp.edu.br",
	},
};

const roomFechada: RoomSummaryItem = {
	id: "room-fechada",
	name: "B102",
	typeAbbreviation: "SALA",
	state: "fechada",
	lastStatusUpdateAt: hoursAgo(0.5),
	currentUser: {
		id: "u2",
		name: "Anderson Deizepe",
		email: "deizepe@ifsp.edu.br",
	},
	lastUser: {
		id: "u2",
		name: "Anderson Deizepe",
		email: "deizepe@ifsp.edu.br",
	},
};

const roomAlerta: RoomSummaryItem = {
	id: "room-alerta",
	name: "C301",
	typeAbbreviation: "LAB",
	state: "alerta",
	lastStatusUpdateAt: hoursAgo(0.1),
	currentUser: null,
	lastUser: null,
};

const roomNomeLongo: RoomSummaryItem = {
	id: "room-longo",
	name: "Laboratório de Desenvolvimento de Software",
	typeAbbreviation: "LDSW",
	state: "aberta",
	lastStatusUpdateAt: hoursAgo(2),
	currentUser: null,
	lastUser: null,
};

const logsComOcupantes: RoomAccessLogsResponse = {
	logs: [
		{
			id: "log-1",
			status: "GRANTED",
			reason: null,
			timestamp: hoursAgo(0.5),
			userId: "u1",
			userName: "Kevin James",
			userEmail: "kevin.james@ifsp.edu.br",
		},
		{
			id: "log-2",
			status: "GRANTED",
			reason: null,
			timestamp: daysAgo(1),
			userId: "u2",
			userName: "Anderson Deizepe",
			userEmail: "deizepe@ifsp.edu.br",
		},
		{
			id: "log-3",
			status: "GRANTED",
			reason: null,
			timestamp: daysAgo(3),
			userId: "u3",
			userName: "Melissa Zanatta",
			userEmail: "melissa.zanatta@ifsp.edu.br",
		},
		// extras para contar no "mais N"
		{
			id: "log-4",
			status: "GRANTED",
			reason: null,
			timestamp: daysAgo(4),
			userId: "u4",
			userName: "Pedro Alves",
			userEmail: "pedro.alves@ifsp.edu.br",
		},
		{
			id: "log-5",
			status: "GRANTED",
			reason: null,
			timestamp: daysAgo(5),
			userId: "u5",
			userName: "Carla Mendes",
			userEmail: "carla.mendes@ifsp.edu.br",
		},
	],
};

const logsSemOcupantes: RoomAccessLogsResponse = { logs: [] };

const logsDenied: RoomAccessLogsResponse = {
	logs: [
		{
			id: "log-denied-1",
			status: "DENIED",
			reason: "NO_PERMISSION",
			timestamp: hoursAgo(1),
			userId: null,
			userName: null,
			userEmail: null,
		},
	],
};

// ── QueryClient factory ───────────────────────────────────────────────────────

type LogsPayload = RoomAccessLogsResponse | null;

function makeQueryClient(
	roomId: string,
	logsPayload: LogsPayload,
	isLoading = false,
) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});

	if (!isLoading && logsPayload !== null) {
		client.setQueryData([...roomsQueryKeys.accessLogs(roomId), 3], logsPayload);
	}

	return client;
}

// ── Decorator factory ─────────────────────────────────────────────────────────

function withQueryClient(
	roomId: string,
	logsPayload: LogsPayload,
	isLoading = false,
) {
	const client = makeQueryClient(roomId, logsPayload, isLoading);
	return (Story: React.ComponentType) => (
		<QueryClientProvider client={client}>
			<Story />
		</QueryClientProvider>
	);
}

// ── Controlled wrapper (shows open drawer immediately) ────────────────────────

interface WrapperProps {
	room: RoomSummaryItem;
	blockName: string;
	authenticated: boolean;
	isAdmin: boolean;
	onClose?: () => void;
}

function DrawerWrapper({
	room,
	blockName,
	authenticated,
	isAdmin,
	onClose = fn(),
}: WrapperProps) {
	const [open, setOpen] = useState(true);

	return (
		<div className="relative w-full h-[600px] overflow-hidden bg-zinc-100 dark:bg-zinc-950 rounded-xl">
			{/* Page content preview behind the drawer */}
			<div className="p-6 flex flex-col gap-2">
				<div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-800 animate-none" />
				<div className="grid grid-cols-3 gap-3 mt-2">
					{(["a", "b", "c", "d", "e", "f"] as const).map((k) => (
						<div
							key={k}
							className="h-20 rounded-lg bg-white dark:bg-zinc-800 shadow-sm"
						/>
					))}
				</div>
			</div>

			{open && (
				<RoomDrawer
					room={room}
					blockName={blockName}
					open={open}
					authenticated={authenticated}
					isAdmin={isAdmin}
					onClose={() => {
						setOpen(false);
						onClose();
					}}
				/>
			)}

			{!open && (
				<div className="absolute inset-0 flex items-center justify-center">
					<button
						type="button"
						onClick={() => setOpen(true)}
						className="px-4 py-2 bg-white dark:bg-zinc-800 rounded-lg text-sm font-medium shadow text-zinc-700 dark:text-zinc-200"
					>
						Reabrir drawer
					</button>
				</div>
			)}
		</div>
	);
}

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
	title: "Rooms/RoomDrawer",
	component: DrawerWrapper,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		authenticated: { control: "boolean" },
		isAdmin: { control: "boolean" },
		blockName: { control: "text" },
		room: { control: "object" },
	},
	args: {
		room: roomAberta,
		blockName: "Bloco A",
		authenticated: true,
		isAdmin: true,
		onClose: fn(),
	},
	decorators: [withQueryClient(roomAberta.id, logsComOcupantes)],
} satisfies Meta<typeof DrawerWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Estados da porta ──────────────────────────────────────────────────────────

export const Aberta: Story = {
	args: {
		room: roomAberta,
		blockName: "Bloco A",
	},
	decorators: [withQueryClient(roomAberta.id, logsComOcupantes)],
	parameters: {
		docs: {
			description: {
				story:
					"Estado **LIVRE** — label verde, exibe logs de últimos ocupantes (admin).",
			},
		},
	},
};

export const Fechada: Story = {
	args: {
		room: roomFechada,
		blockName: "Bloco B",
	},
	decorators: [withQueryClient(roomFechada.id, logsComOcupantes)],
	parameters: {
		docs: {
			description: {
				story:
					"Estado **EM USO** — label cinza, usuário atual visível nos logs.",
			},
		},
	},
};

export const Alerta: Story = {
	args: {
		room: roomAlerta,
		blockName: "Bloco C",
	},
	decorators: [withQueryClient(roomAlerta.id, logsComOcupantes)],
	parameters: {
		docs: {
			description: {
				story:
					"Estado **ALERTA** — label vermelho, porta aberta sem autorização.",
			},
		},
	},
};

// ── Admin: variações de logs ──────────────────────────────────────────────────

export const AdminComLogs: Story = {
	args: {
		room: roomAberta,
		blockName: "Bloco A",
		isAdmin: true,
	},
	decorators: [withQueryClient(roomAberta.id, logsComOcupantes)],
	parameters: {
		docs: {
			description: {
				story:
					'Admin vê a seção **Últimos ocupantes** com até 3 entradas e o link "mais N ocupantes...".',
			},
		},
	},
};

export const AdminSemLogs: Story = {
	args: {
		room: roomAberta,
		blockName: "Bloco A",
		isAdmin: true,
	},
	decorators: [withQueryClient(roomAberta.id, logsSemOcupantes)],
	parameters: {
		docs: {
			description: {
				story:
					'Admin vê a seção, mas sem entradas — exibe mensagem "Nenhum acesso registrado.".',
			},
		},
	},
};

export const AdminApenasDenied: Story = {
	args: {
		room: roomAberta,
		blockName: "Bloco A",
		isAdmin: true,
	},
	decorators: [withQueryClient(roomAberta.id, logsDenied)],
	parameters: {
		docs: {
			description: {
				story:
					"Todos os logs são DENIED (sem usuário válido) — trata igual a sem logs.",
			},
		},
	},
};

export const AdminCarregandoLogs: Story = {
	args: {
		room: roomAberta,
		blockName: "Bloco A",
		isAdmin: true,
	},
	decorators: [withQueryClient(roomAberta.id, null, true)],
	parameters: {
		docs: {
			description: {
				story:
					"Query ainda pendente — exibe skeleton de 3 linhas na seção de logs.",
			},
		},
	},
};

// ── Visibilidade por papel ────────────────────────────────────────────────────

export const NaoAdmin: Story = {
	args: {
		room: roomAberta,
		blockName: "Bloco A",
		authenticated: true,
		isAdmin: false,
	},
	decorators: [withQueryClient(roomAberta.id, null)],
	parameters: {
		docs: {
			description: {
				story:
					"Usuário autenticado, mas **não admin** — seção de logs não é renderizada.",
			},
		},
	},
};

export const Anonimo: Story = {
	args: {
		room: roomAberta,
		blockName: "Bloco A",
		authenticated: false,
		isAdmin: false,
	},
	decorators: [withQueryClient(roomAberta.id, null)],
	parameters: {
		docs: {
			description: {
				story:
					"Usuário não autenticado — sem logs, sem informações de usuário.",
			},
		},
	},
};

// ── Casos de borda ────────────────────────────────────────────────────────────

export const NomeLongo: Story = {
	args: {
		room: roomNomeLongo,
		blockName: "Bloco Laboratórios",
		isAdmin: true,
	},
	decorators: [withQueryClient(roomNomeLongo.id, logsComOcupantes)],
	parameters: {
		docs: {
			description: {
				story: "Nome de sala muito longo — deve ajustar o layout sem quebrar.",
			},
		},
	},
};

export const SemTimestamp: Story = {
	args: {
		room: {
			...roomAberta,
			id: "room-sem-ts",
			lastStatusUpdateAt: null,
			lastUser: null,
		},
		blockName: "Bloco A",
		isAdmin: true,
	},
	decorators: [withQueryClient("room-sem-ts", logsSemOcupantes)],
	parameters: {
		docs: {
			description: {
				story: "Sala sem nenhum registro de atualização.",
			},
		},
	},
};

// ── Dark mode ─────────────────────────────────────────────────────────────────

export const AbertaDark: Story = {
	args: {
		room: roomAberta,
		blockName: "Bloco A",
		isAdmin: true,
	},
	decorators: [
		withQueryClient(roomAberta.id, logsComOcupantes),
		(Story) => (
			<div className="dark">
				<Story />
			</div>
		),
	],
	parameters: {
		backgrounds: { default: "dark" },
		docs: {
			description: {
				story: "Estado LIVRE no tema escuro.",
			},
		},
	},
};

export const FechadaDark: Story = {
	args: {
		room: roomFechada,
		blockName: "Bloco B",
		isAdmin: true,
	},
	decorators: [
		withQueryClient(roomFechada.id, logsComOcupantes),
		(Story) => (
			<div className="dark">
				<Story />
			</div>
		),
	],
	parameters: {
		backgrounds: { default: "dark" },
		docs: {
			description: {
				story: "Estado EM USO no tema escuro.",
			},
		},
	},
};

export const AlertaDark: Story = {
	args: {
		room: roomAlerta,
		blockName: "Bloco C",
		isAdmin: true,
	},
	decorators: [
		withQueryClient(roomAlerta.id, logsComOcupantes),
		(Story) => (
			<div className="dark">
				<Story />
			</div>
		),
	],
	parameters: {
		backgrounds: { default: "dark" },
		docs: {
			description: {
				story: "Estado ALERTA no tema escuro.",
			},
		},
	},
};

// ── Comparativo de estados ────────────────────────────────────────────────────

export const TodosOsEstados: Story = {
	render: () => {
		const client = new QueryClient({
			defaultOptions: {
				queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
			},
		});
		client.setQueryData(
			[...roomsQueryKeys.accessLogs(roomAberta.id), 3],
			logsComOcupantes,
		);
		client.setQueryData(
			[...roomsQueryKeys.accessLogs(roomFechada.id), 3],
			logsComOcupantes,
		);
		client.setQueryData(
			[...roomsQueryKeys.accessLogs(roomAlerta.id), 3],
			logsSemOcupantes,
		);

		return (
			<QueryClientProvider client={client}>
				<div className="flex flex-col gap-6">
					<p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
						Clique em cada card para abrir o drawer correspondente
					</p>
					<div className="flex gap-4 flex-wrap">
						{[
							{ room: roomAberta, block: "Bloco A", logs: logsComOcupantes },
							{ room: roomFechada, block: "Bloco B", logs: logsComOcupantes },
							{ room: roomAlerta, block: "Bloco C", logs: logsSemOcupantes },
						].map(({ room, block }) => (
							<DrawerWrapper
								key={room.id}
								room={room}
								blockName={block}
								authenticated
								isAdmin
								onClose={fn()}
							/>
						))}
					</div>
				</div>
			</QueryClientProvider>
		);
	},
	decorators: [],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Os três estados (LIVRE, EM USO, ALERTA) em simultâneo para comparação.",
			},
		},
	},
};
