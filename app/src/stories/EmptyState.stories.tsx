import type { Meta, StoryObj } from "@storybook/react";
import {
	AlertTriangle,
	Building2,
	DoorOpen,
	FileX,
	Inbox,
	Search,
	ShieldOff,
	Tag,
	Users,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

const meta = {
	title: "UI/EmptyState",
	component: EmptyState,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		message: { control: "text" },
		icon: {
			control: false,
			description: "Componente de ícone do lucide-react",
		},
	},
	args: {
		icon: Search,
		message: "Nenhum resultado encontrado.",
	},
	decorators: [
		(Story) => (
			<div className="w-96 border rounded-lg bg-white dark:bg-zinc-900">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Estados básicos ───────────────────────────────────────────────────────────

export const Default: Story = {};

export const NoResults: Story = {
	args: {
		icon: Search,
		message: "Nenhum resultado encontrado com os filtros aplicados.",
	},
};

export const NoItems: Story = {
	args: {
		icon: Inbox,
		message: "Nenhum item cadastrado até o momento.",
	},
};

// ── Casos de uso reais ────────────────────────────────────────────────────────

export const NoUsers: Story = {
	args: {
		icon: Users,
		message: "Nenhum usuário encontrado.",
	},
	parameters: {
		docs: {
			description: {
				story: "Estado vazio da listagem de usuários quando não há resultados.",
			},
		},
	},
};

export const NoUsersFiltered: Story = {
	args: {
		icon: Users,
		message: "Nenhum usuário encontrado com os filtros aplicados.",
	},
};

export const NoRooms: Story = {
	args: {
		icon: DoorOpen,
		message: "Nenhuma sala cadastrada até o momento.",
	},
	parameters: {
		docs: {
			description: {
				story:
					"Estado vazio da listagem de salas quando ainda não há cadastros.",
			},
		},
	},
};

export const NoRoomsFiltered: Story = {
	args: {
		icon: Search,
		message: "Nenhuma sala encontrada com os filtros aplicados.",
	},
	parameters: {
		docs: {
			description: {
				story:
					"Estado vazio exibido na página principal quando nenhuma sala bate com a busca ou filtros.",
			},
		},
	},
};

export const NoBlocks: Story = {
	args: {
		icon: Building2,
		message: "Nenhum bloco cadastrado.",
	},
};

export const NoRoomTypes: Story = {
	args: {
		icon: Tag,
		message: "Nenhum tipo de sala cadastrado.",
	},
};

export const NoProfiles: Story = {
	args: {
		icon: ShieldOff,
		message: "Nenhum perfil de acesso cadastrado.",
	},
};

export const NoFile: Story = {
	args: {
		icon: FileX,
		message: "Arquivo não encontrado ou sem permissão de acesso.",
	},
};

export const Alert: Story = {
	args: {
		icon: AlertTriangle,
		message: "Ocorreu um erro ao carregar os dados. Tente novamente.",
	},
	parameters: {
		docs: {
			description: {
				story: "Pode ser reaproveitado para estados de erro leve.",
			},
		},
	},
};

// ── Grid com vários casos ─────────────────────────────────────────────────────

export const AllExamples: Story = {
	render: () => (
		<div className="grid grid-cols-2 gap-4 p-4">
			{[
				{ icon: Search, message: "Nenhum resultado." },
				{ icon: Users, message: "Nenhum usuário." },
				{ icon: Building2, message: "Nenhum bloco." },
				{ icon: DoorOpen, message: "Nenhuma sala." },
				{ icon: Tag, message: "Nenhum tipo." },
				{ icon: ShieldOff, message: "Nenhum perfil." },
			].map(({ icon, message }) => (
				<div
					key={message}
					className="border rounded-lg bg-white dark:bg-zinc-900"
				>
					<EmptyState icon={icon} message={message} />
				</div>
			))}
		</div>
	),
	parameters: {
		layout: "padded",
		docs: {
			description: {
				story: "Grid mostrando todos os casos de uso do EmptyState no projeto.",
			},
		},
	},
	decorators: [],
};
