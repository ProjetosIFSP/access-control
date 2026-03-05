import type { Meta, StoryObj } from "@storybook/react";
import { RoomCard, type RoomCardItem } from "@/components/rooms/room-card";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseRoom: RoomCardItem = {
	id: "room-1",
	name: "Sala 101",
	typeAbbreviation: "LAB",
	state: "aberta",
	lastStatusUpdateAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min ago
	currentUser: null,
	lastUser: null,
};

const userAlice = {
	id: "u1",
	name: "Alice Ferreira",
	email: "alice@ifsp.edu.br",
};
const userBob = { id: "u2", name: "Bob Santos", email: "bob@ifsp.edu.br" };

const roomAberta: RoomCardItem = {
	...baseRoom,
	state: "aberta",
	lastStatusUpdateAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
	lastUser: userAlice,
};

const roomFechada: RoomCardItem = {
	...baseRoom,
	id: "room-2",
	name: "Sala 202",
	typeAbbreviation: "SALA",
	state: "fechada",
	lastStatusUpdateAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
	currentUser: userBob,
	lastUser: userAlice,
};

const roomAlerta: RoomCardItem = {
	...baseRoom,
	id: "room-3",
	name: "Auditório A",
	typeAbbreviation: "AUD",
	state: "alerta",
	lastStatusUpdateAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
	currentUser: userBob,
	lastUser: userBob,
};

const roomNoTimestamp: RoomCardItem = {
	...baseRoom,
	id: "room-4",
	name: "Sala 305",
	typeAbbreviation: "SALA",
	state: "aberta",
	lastStatusUpdateAt: null,
	currentUser: null,
	lastUser: null,
};

const roomYesterday: RoomCardItem = {
	...baseRoom,
	id: "room-5",
	name: "Lab de Redes",
	typeAbbreviation: "LAB",
	state: "fechada",
	lastStatusUpdateAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // yesterday
	currentUser: userAlice,
	lastUser: userAlice,
};

const roomLongName: RoomCardItem = {
	...baseRoom,
	id: "room-6",
	name: "Laboratório de Desenvolvimento de Software",
	typeAbbreviation: "LDSW",
	state: "aberta",
	lastStatusUpdateAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
	lastUser: userBob,
};

// ── Meta ──────────────────────────────────────────────────────────────────────

const meta = {
	title: "Rooms/RoomCard",
	component: RoomCard,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		authenticated: { control: "boolean" },
		room: { control: "object" },
	},
	args: {
		room: roomAberta,
		authenticated: true,
	},
	decorators: [
		(Story) => (
			<div className="flex p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof RoomCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Estados ───────────────────────────────────────────────────────────────────

export const Aberta: Story = {
	args: {
		room: roomAberta,
		authenticated: true,
	},
	parameters: {
		docs: {
			description: {
				story: "Sala livre — indicador verde, mostra o último usuário.",
			},
		},
	},
};

export const Fechada: Story = {
	args: {
		room: roomFechada,
		authenticated: true,
	},
	parameters: {
		docs: {
			description: {
				story: "Sala em uso — indicador cinza, mostra o usuário atual.",
			},
		},
	},
};

export const Alerta: Story = {
	args: {
		room: roomAlerta,
		authenticated: true,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Sala em alerta — indicador vermelho escuro, mostra o usuário atual.",
			},
		},
	},
};

// ── Autenticação ──────────────────────────────────────────────────────────────

export const AbertaAutenticado: Story = {
	args: {
		room: roomAberta,
		authenticated: true,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Usuário autenticado vê o nome do último usuário que usou a sala.",
			},
		},
	},
};

export const AbertaAnonimo: Story = {
	args: {
		room: roomAberta,
		authenticated: false,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Usuário não autenticado — informações de usuário ficam ocultas.",
			},
		},
	},
};

export const FechadaAutenticado: Story = {
	args: {
		room: roomFechada,
		authenticated: true,
	},
};

export const FechadaAnonimo: Story = {
	args: {
		room: roomFechada,
		authenticated: false,
	},
};

export const AlertaAutenticado: Story = {
	args: {
		room: roomAlerta,
		authenticated: true,
	},
};

export const AlertaAnonimo: Story = {
	args: {
		room: roomAlerta,
		authenticated: false,
	},
};

// ── Casos de borda ────────────────────────────────────────────────────────────

export const SemTimestamp: Story = {
	args: {
		room: roomNoTimestamp,
		authenticated: true,
	},
	parameters: {
		docs: {
			description: {
				story:
					'Sala sem nenhuma atualização registrada — exibe "Sem registro".',
			},
		},
	},
};

export const TimestampOntem: Story = {
	args: {
		room: roomYesterday,
		authenticated: true,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Quando o último uso foi antes de hoje, exibe tempo relativo (ex: 'há 1 dia') em vez do horário.",
			},
		},
	},
};

export const NomeLongo: Story = {
	args: {
		room: roomLongName,
		authenticated: true,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Nome de sala muito longo — deve truncar com ellipsis dentro da largura fixa do card.",
			},
		},
	},
};

export const SemUsuario: Story = {
	args: {
		room: {
			...roomAberta,
			lastUser: null,
			currentUser: null,
		},
		authenticated: true,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Sala aberta sem nenhum usuário vinculado — sem linha de usuário.",
			},
		},
	},
};

// ── Grid completo ─────────────────────────────────────────────────────────────

export const TodosOsEstados: Story = {
	render: () => (
		<div className="flex gap-3 flex-wrap p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
			<RoomCard room={roomAberta} authenticated />
			<RoomCard room={roomFechada} authenticated />
			<RoomCard room={roomAlerta} authenticated />
		</div>
	),
	decorators: [],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Os três estados possíveis de uma sala: livre, em uso e em alerta.",
			},
		},
	},
};

export const AutenticadoVsAnonimo: Story = {
	render: () => (
		<div className="flex flex-col gap-6 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
			<div>
				<p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 pl-1">
					Autenticado
				</p>
				<div className="flex gap-3">
					<RoomCard room={roomAberta} authenticated />
					<RoomCard room={roomFechada} authenticated />
					<RoomCard room={roomAlerta} authenticated />
				</div>
			</div>
			<div>
				<p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 pl-1">
					Anônimo
				</p>
				<div className="flex gap-3">
					<RoomCard room={roomAberta} authenticated={false} />
					<RoomCard room={roomFechada} authenticated={false} />
					<RoomCard room={roomAlerta} authenticated={false} />
				</div>
			</div>
		</div>
	),
	decorators: [],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Comparação direta entre visualização autenticada e anônima para os três estados.",
			},
		},
	},
};

export const EdgeCases: Story = {
	render: () => (
		<div className="flex gap-3 flex-wrap p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
			<RoomCard room={roomNoTimestamp} authenticated />
			<RoomCard room={roomYesterday} authenticated />
			<RoomCard room={roomLongName} authenticated />
		</div>
	),
	decorators: [],
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story:
					"Casos de borda: sem timestamp, timestamp de ontem e nome longo.",
			},
		},
	},
};
