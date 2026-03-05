import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";

const meta = {
	title: "UI/Badge",
	component: Badge,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["default", "secondary", "destructive", "outline"],
		},
		children: { control: "text" },
	},
	args: {
		children: "Badge",
	},
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Variants ──────────────────────────────────────────────────────────────────

export const Default: Story = {
	args: { variant: "default" },
};

export const Secondary: Story = {
	args: { variant: "secondary", children: "Secondary" },
};

export const Destructive: Story = {
	args: { variant: "destructive", children: "Erro" },
};

export const Outline: Story = {
	args: { variant: "outline", children: "Outline" },
};

// ── Conteúdo variado ──────────────────────────────────────────────────────────

export const ShortText: Story = {
	args: { children: "TI" },
};

export const LongText: Story = {
	args: { children: "Laboratório de Informática" },
};

export const Numeric: Story = {
	args: { children: "42" },
};

export const Zero: Story = {
	args: { children: "0" },
};

// ── Casos de uso reais ────────────────────────────────────────────────────────

export const RoomType: Story = {
	args: {
		variant: "outline",
		children: "LAB",
	},
	parameters: {
		docs: {
			description: {
				story: "Usado nos cards de sala para exibir a abreviação do tipo.",
			},
		},
	},
};

export const ActiveTab: Story = {
	args: {
		children: "12",
	},
	parameters: {
		docs: {
			description: {
				story: "Usado nos TabButtons para indicar quantidade de itens.",
			},
		},
	},
};

export const InactiveTab: Story = {
	render: () => (
		<Badge className="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-100">
			5
		</Badge>
	),
	parameters: {
		docs: {
			description: {
				story: "Estilo de badge inativa dentro de TabButton.",
			},
		},
	},
};

// ── Grid com todas as variantes ───────────────────────────────────────────────

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3 items-center">
			<Badge variant="default">Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	),
};

export const ContextExamples: Story = {
	render: () => (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-2">
				<span className="text-sm text-zinc-600">Status:</span>
				<Badge variant="default">Ativo</Badge>
				<Badge variant="destructive">Inativo</Badge>
				<Badge variant="secondary">Pendente</Badge>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm text-zinc-600">Tipo de sala:</span>
				<Badge variant="outline">LAB</Badge>
				<Badge variant="outline">SALA</Badge>
				<Badge variant="outline">AUD</Badge>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-sm text-zinc-600">Contadores:</span>
				<Badge>1</Badge>
				<Badge>12</Badge>
				<Badge>99+</Badge>
			</div>
		</div>
	),
};
