import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Plus, Trash2 } from "lucide-react";
import { fn } from "storybook/test";
import { Button } from "@/components/ui/button";

const meta = {
	title: "UI/Button",
	component: Button,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: [
				"default",
				"destructive",
				"outline",
				"secondary",
				"ghost",
				"link",
				"hover",
				"hoverOutline",
			],
		},
		size: {
			control: "select",
			options: [
				"default",
				"xs",
				"sm",
				"lg",
				"icon",
				"icon-xs",
				"icon-sm",
				"icon-lg",
			],
		},
		disabled: { control: "boolean" },
		children: { control: "text" },
	},
	args: {
		onClick: fn(),
		children: "Botão",
	},
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Variants ──────────────────────────────────────────────────────────────────

export const Default: Story = {
	args: { variant: "default" },
};

export const Destructive: Story = {
	args: { variant: "destructive", children: "Excluir" },
};

export const Outline: Story = {
	args: { variant: "outline" },
};

export const Secondary: Story = {
	args: { variant: "secondary" },
};

export const Ghost: Story = {
	args: { variant: "ghost" },
};

export const Link: Story = {
	args: { variant: "link" },
};

export const Hover: Story = {
	args: { variant: "hover", children: "Hover Effect" },
};

export const HoverOutline: Story = {
	args: { variant: "hoverOutline", children: "Hover Outline" },
};

// ── Sizes ─────────────────────────────────────────────────────────────────────

export const ExtraSmall: Story = {
	args: { size: "xs", children: "Extra pequeno" },
};

export const Small: Story = {
	args: { size: "sm", children: "Pequeno" },
};

export const Large: Story = {
	args: { size: "lg", children: "Grande" },
};

export const Icon: Story = {
	args: { size: "icon", children: <Plus /> },
};

export const IconSmall: Story = {
	args: { size: "icon-sm", children: <Plus /> },
};

export const IconLarge: Story = {
	args: { size: "icon-lg", children: <Plus /> },
};

// ── States ────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
	args: { disabled: true, children: "Desabilitado" },
};

export const DisabledDestructive: Story = {
	args: { variant: "destructive", disabled: true, children: "Desabilitado" },
};

// ── With icons ────────────────────────────────────────────────────────────────

export const WithLeadingIcon: Story = {
	args: {
		children: (
			<>
				<Mail />
				Enviar email
			</>
		),
	},
};

export const WithTrailingIcon: Story = {
	args: {
		children: (
			<>
				Excluir item
				<Trash2 />
			</>
		),
		variant: "destructive",
	},
};

export const IconOnly: Story = {
	args: {
		size: "icon",
		children: <Trash2 />,
		variant: "outline",
		"aria-label": "Excluir",
	},
};

// ── All variants grid ─────────────────────────────────────────────────────────

export const AllVariants: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3 items-center">
			<Button variant="default">Default</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	),
};

export const AllSizes: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3 items-center">
			<Button size="xs">Extra Small</Button>
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon-sm">
				<Plus />
			</Button>
			<Button size="icon">
				<Plus />
			</Button>
			<Button size="icon-lg">
				<Plus />
			</Button>
		</div>
	),
};
