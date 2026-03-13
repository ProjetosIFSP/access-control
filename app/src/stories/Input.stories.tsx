import type { Meta, StoryObj } from "@storybook/react";
import { Eye, EyeOff, Lock, Mail, Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const meta = {
	title: "UI/Input",
	component: Input,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		type: {
			control: "select",
			options: ["text", "email", "password", "number", "search", "tel", "url"],
		},
		placeholder: { control: "text" },
		disabled: { control: "boolean" },
		"aria-invalid": { control: "boolean" },
	},
	args: {
		placeholder: "Digite aqui...",
	},
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── States ────────────────────────────────────────────────────────────────────

export const Default: Story = {};

export const WithValue: Story = {
	args: {
		defaultValue: "Valor preenchido",
	},
};

export const Placeholder: Story = {
	args: {
		placeholder: "Buscar salas, blocos...",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultValue: "Campo desabilitado",
	},
};

export const DisabledEmpty: Story = {
	args: {
		disabled: true,
		placeholder: "Campo desabilitado",
	},
};

export const Invalid: Story = {
	args: {
		"aria-invalid": true,
		defaultValue: "Valor inválido",
	},
};

export const InvalidEmpty: Story = {
	args: {
		"aria-invalid": true,
		placeholder: "Campo com erro",
	},
};

// ── Types ─────────────────────────────────────────────────────────────────────

export const Email: Story = {
	args: {
		type: "email",
		placeholder: "seu@email.com",
	},
};

export const Password: Story = {
	args: {
		type: "password",
		placeholder: "Senha",
		defaultValue: "senha123",
	},
};

export const NumberInput: Story = {
	args: {
		type: "number",
		placeholder: "0",
		min: 0,
		max: 100,
	},
};

export const SearchType: Story = {
	args: {
		type: "search",
		placeholder: "Buscar...",
	},
};

// ── Com ícone (composição) ────────────────────────────────────────────────────

export const WithLeadingIcon: Story = {
	render: (args) => (
		<div className="relative w-80">
			<SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
			<Input {...args} className="pl-9" />
		</div>
	),
	args: {
		placeholder: "Buscar salas...",
	},
};

export const WithEmailIcon: Story = {
	render: (args) => (
		<div className="relative w-80">
			<Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
			<Input {...args} type="email" className="pl-9" />
		</div>
	),
	args: {
		placeholder: "seu@email.com",
	},
};

export const PasswordToggle: Story = {
	render: (args) => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [show, setShow] = useState(false);
		return (
			<div className="relative w-80">
				<Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
				<Input
					{...args}
					type={show ? "text" : "password"}
					className="pl-9 pr-10"
				/>
				<button
					type="button"
					onClick={() => setShow((v) => !v)}
					className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
					aria-label={show ? "Ocultar senha" : "Mostrar senha"}
				>
					{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
				</button>
			</div>
		);
	},
	args: {
		placeholder: "Senha",
		defaultValue: "minha-senha-secreta",
	},
};

// ── Casos de uso reais ────────────────────────────────────────────────────────

export const SearchToolbarLike: Story = {
	render: () => (
		<div className="relative w-80">
			<SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
			<Input
				placeholder="Buscar por sala ou bloco…"
				className="pl-9 pr-16 bg-white"
			/>
			<div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
				<kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-600">
					Ctrl
				</kbd>
				<kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-600">
					K
				</kbd>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story:
					"Composição usada na barra de busca principal da página de monitoramento.",
			},
		},
	},
};

export const FormFieldLike: Story = {
	render: () => (
		<div className="flex flex-col gap-1.5 w-80">
			<label
				htmlFor="nome"
				className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				Nome completo
			</label>
			<Input id="nome" placeholder="Ex: João Silva" />
			<span className="text-xs text-muted-foreground">
				Informe o nome como aparece no documento.
			</span>
		</div>
	),
};

export const FormFieldWithError: Story = {
	render: () => (
		<div className="flex flex-col gap-1.5 w-80">
			<label
				htmlFor="email-err"
				className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				Email
			</label>
			<Input
				id="email-err"
				type="email"
				aria-invalid
				defaultValue="email-invalido"
			/>
			<span className="text-xs text-destructive">
				Informe um endereço de e-mail válido.
			</span>
		</div>
	),
};

// ── Grid completo de estados ──────────────────────────────────────────────────

export const AllStates: Story = {
	render: () => (
		<div className="flex flex-col gap-3 w-80">
			<Input placeholder="Padrão (vazio)" />
			<Input defaultValue="Com valor" />
			<Input placeholder="Desabilitado" disabled />
			<Input defaultValue="Desabilitado com valor" disabled />
			<Input aria-invalid placeholder="Inválido (vazio)" />
			<Input aria-invalid defaultValue="Inválido com valor" />
		</div>
	),
};
