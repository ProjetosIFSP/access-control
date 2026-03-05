import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { TabButton } from "@/components/ui/tab-button";

const meta = {
	title: "UI/TabButton",
	component: TabButton,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		active: { control: "boolean" },
		label: { control: "text" },
		count: { control: "number" },
		onClick: { action: "clicked" },
	},
	args: {
		onClick: fn(),
		label: "Usuários",
		count: 10,
		active: false,
	},
} satisfies Meta<typeof TabButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── States ────────────────────────────────────────────────────────────────────

export const Default: Story = {
	args: {
		active: false,
		label: "Usuários",
		count: 10,
	},
};

export const Active: Story = {
	args: {
		active: true,
		label: "Usuários",
		count: 10,
	},
};

export const InactiveZero: Story = {
	args: {
		active: false,
		label: "Perfis",
		count: 0,
	},
};

export const ActiveZero: Story = {
	args: {
		active: true,
		label: "Perfis",
		count: 0,
	},
};

export const LargeCount: Story = {
	args: {
		active: false,
		label: "Salas",
		count: 999,
	},
};

export const ActiveLargeCount: Story = {
	args: {
		active: true,
		label: "Salas",
		count: 999,
	},
};

export const LongLabel: Story = {
	args: {
		active: false,
		label: "Tipos de Sala",
		count: 7,
	},
};

export const ActiveLongLabel: Story = {
	args: {
		active: true,
		label: "Tipos de Sala",
		count: 7,
	},
};

// ── Tab groups ────────────────────────────────────────────────────────────────

export const UsersTabGroup: Story = {
	render: () => (
		<div className="flex border-b">
			<TabButton active label="Usuários" count={24} onClick={fn()} />
			<TabButton active={false} label="Perfis" count={5} onClick={fn()} />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: "Grupo de tabs da página de usuários com o primeiro tab ativo.",
			},
		},
	},
};

export const RoomsTabGroup: Story = {
	render: () => (
		<div className="flex border-b">
			<TabButton active label="Salas" count={48} onClick={fn()} />
			<TabButton active={false} label="Blocos" count={6} onClick={fn()} />
			<TabButton active={false} label="Tipos" count={4} onClick={fn()} />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: "Grupo de tabs da página de salas administrativo com três abas.",
			},
		},
	},
};

export const RoomsTabGroupBlocksActive: Story = {
	render: () => (
		<div className="flex border-b">
			<TabButton active={false} label="Salas" count={48} onClick={fn()} />
			<TabButton active label="Blocos" count={6} onClick={fn()} />
			<TabButton active={false} label="Tipos" count={4} onClick={fn()} />
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: "Grupo de tabs com o segundo tab (Blocos) ativo.",
			},
		},
	},
};

export const AllInactive: Story = {
	render: () => (
		<div className="flex border-b">
			<TabButton active={false} label="Aba 1" count={3} onClick={fn()} />
			<TabButton active={false} label="Aba 2" count={12} onClick={fn()} />
			<TabButton active={false} label="Aba 3" count={0} onClick={fn()} />
		</div>
	),
};
