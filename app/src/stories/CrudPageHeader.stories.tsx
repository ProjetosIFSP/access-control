import type { Meta, StoryObj } from "@storybook/react";
import { CrudPageHeader } from "@/components/ui/crud-page-header";

const meta = {
	title: "UI/CrudPageHeader",
	component: CrudPageHeader,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		title: { control: "text" },
		subtitle: { control: "text" },
	},
	args: {
		title: "Usuários e Perfis",
	},
	decorators: [
		(Story) => (
			<div className="max-w-2xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof CrudPageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Variantes principais ──────────────────────────────────────────────────────

export const TitleOnly: Story = {
	args: {
		title: "Usuários e Perfis",
	},
};

export const WithSubtitle: Story = {
	args: {
		title: "Usuários e Perfis",
		subtitle: "Gerencie os usuários e perfis de acesso do sistema.",
	},
};

// ── Casos de uso reais ────────────────────────────────────────────────────────

export const UsersPage: Story = {
	args: {
		title: "Usuários e Perfis",
		subtitle: "Gerencie os usuários e perfis de acesso do sistema.",
	},
	parameters: {
		docs: {
			description: {
				story: "Cabeçalho usado na página de gerenciamento de usuários.",
			},
		},
	},
};

export const RoomsPage: Story = {
	args: {
		title: "Salas e Blocos",
		subtitle: "Gerencie as salas e blocos cadastrados no sistema.",
	},
	parameters: {
		docs: {
			description: {
				story: "Cabeçalho usado na página de gerenciamento de salas.",
			},
		},
	},
};

export const ProfilesPage: Story = {
	args: {
		title: "Perfis de Acesso",
		subtitle: "Configure os perfis e permissões de acesso às salas.",
	},
};

export const RoomTypesSection: Story = {
	args: {
		title: "Tipos de Sala",
		subtitle: "Categorias usadas para classificar as salas cadastradas.",
	},
};

export const BlocksSection: Story = {
	args: {
		title: "Blocos",
		subtitle: "Blocos físicos que agrupam as salas do campus.",
	},
};

// ── Conteúdo longo ────────────────────────────────────────────────────────────

export const LongTitle: Story = {
	args: {
		title: "Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente",
	},
};

export const LongTitleWithSubtitle: Story = {
	args: {
		title: "Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente",
		subtitle:
			"Controle total sobre os espaços físicos do campus, incluindo configuração de acesso, biometria e RFID por sala.",
	},
};

export const ShortTitle: Story = {
	args: {
		title: "Salas",
	},
};

// ── Grid com todas as variantes ───────────────────────────────────────────────

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-col gap-8 max-w-2xl">
			<div className="border-b pb-4">
				<p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
					Só título
				</p>
				<CrudPageHeader title="Usuários e Perfis" />
			</div>
			<div className="border-b pb-4">
				<p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
					Título + subtítulo
				</p>
				<CrudPageHeader
					title="Usuários e Perfis"
					subtitle="Gerencie os usuários e perfis de acesso do sistema."
				/>
			</div>
			<div className="border-b pb-4">
				<p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
					Título longo
				</p>
				<CrudPageHeader title="Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente" />
			</div>
			<div>
				<p className="text-xs text-zinc-400 uppercase tracking-wider mb-3">
					Título longo + subtítulo longo
				</p>
				<CrudPageHeader
					title="Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente"
					subtitle="Controle total sobre os espaços físicos do campus, incluindo configuração de acesso, biometria e RFID por sala."
				/>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Grade mostrando todas as combinações possíveis do CrudPageHeader.",
			},
		},
	},
	decorators: [],
};
