import type { Meta, StoryObj } from "@storybook/react";

import { useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const meta = {
	title: "UI/FormField",
	component: FormField,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		label: { control: "text" },
		htmlFor: { control: "text" },
		error: { control: "text" },
		hint: { control: "text" },
	},
	args: {
		label: "Nome completo",
		htmlFor: "nome",
		children: <Input id="nome" placeholder="Ex: João Silva" />,
	},
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Estados básicos ───────────────────────────────────────────────────────────

export const Default: Story = {};

export const WithHint: Story = {
	args: {
		label: "Nome completo",
		htmlFor: "nome-hint",
		hint: "Informe o nome como aparece no documento.",
		children: <Input id="nome-hint" placeholder="Ex: João Silva" />,
	},
};

export const WithError: Story = {
	args: {
		label: "Email",
		htmlFor: "email-error",
		error: "Informe um endereço de e-mail válido.",
		children: (
			<Input
				id="email-error"
				type="email"
				aria-invalid
				defaultValue="email-invalido"
			/>
		),
	},
	parameters: {
		docs: {
			description: {
				story:
					"Quando `error` está definido, ele tem prioridade sobre `hint` e é exibido em vermelho abaixo do campo.",
			},
		},
	},
};

export const ErrorOverridesHint: Story = {
	args: {
		label: "Email",
		htmlFor: "email-both",
		hint: "Será usado para login.",
		error: "Este email já está cadastrado.",
		children: (
			<Input
				id="email-both"
				type="email"
				aria-invalid
				defaultValue="joao@ifsp.edu.br"
			/>
		),
	},
	parameters: {
		docs: {
			description: {
				story:
					"Quando `error` e `hint` estão ambos definidos, apenas o `error` é exibido.",
			},
		},
	},
};

export const NoHelperText: Story = {
	args: {
		label: "Abreviação",
		htmlFor: "abbr-clean",
		children: <Input id="abbr-clean" placeholder="Ex: LAB" />,
	},
	parameters: {
		docs: {
			description: {
				story: "Campo sem texto auxiliar — apenas label + input.",
			},
		},
	},
};

// ── Tipos de input ────────────────────────────────────────────────────────────

export const EmailField: Story = {
	args: {
		label: "Email institucional",
		htmlFor: "email-field",
		hint: "Será usado para login e notificações.",
		children: (
			<Input id="email-field" type="email" placeholder="seu@ifsp.edu.br" />
		),
	},
};

export const PasswordField: Story = {
	args: {
		label: "Senha",
		htmlFor: "password-field",
		hint: "Mínimo de 8 caracteres.",
		children: (
			<Input id="password-field" type="password" placeholder="••••••••" />
		),
	},
};

export const TextareaField: Story = {
	args: {
		label: "Descrição",
		htmlFor: "descricao-field",
		hint: "Descreva brevemente o perfil de acesso.",
		children: (
			<Textarea
				id="descricao-field"
				placeholder="Ex: Perfil para professores do bloco B..."
				rows={3}
			/>
		),
	},
	parameters: {
		docs: {
			description: {
				story:
					"FormField funciona com qualquer elemento filho — aqui com Textarea.",
			},
		},
	},
};

export const TextareaWithError: Story = {
	args: {
		label: "Descrição",
		htmlFor: "descricao-error",
		error: "A descrição não pode estar vazia.",
		children: (
			<Textarea
				id="descricao-error"
				aria-invalid
				placeholder="Ex: Perfil para professores..."
				rows={3}
			/>
		),
	},
};

// ── Casos de uso reais ────────────────────────────────────────────────────────

export const UserNameField: Story = {
	args: {
		label: "Nome",
		htmlFor: "user-name",
		hint: "Nome completo do usuário.",
		children: <Input id="user-name" placeholder="Ex: Maria Oliveira" />,
	},
	parameters: {
		docs: {
			description: {
				story:
					"Campo de nome usado no formulário de criação/edição de usuário.",
			},
		},
	},
};

export const RoomNameField: Story = {
	args: {
		label: "Nome da sala",
		htmlFor: "room-name",
		hint: "Identificação da sala no campus.",
		children: <Input id="room-name" placeholder="Ex: Sala 101" />,
	},
	parameters: {
		docs: {
			description: {
				story: "Campo de nome da sala no formulário de cadastro de sala.",
			},
		},
	},
};

export const RoomTypeAbbreviationField: Story = {
	args: {
		label: "Abreviação",
		htmlFor: "room-type-abbr",
		hint: "Sigla curta exibida nos cards de sala (ex: LAB, SALA, AUD).",
		children: <Input id="room-type-abbr" placeholder="Ex: LAB" />,
	},
};

export const RoomTypeAbbreviationError: Story = {
	args: {
		label: "Abreviação",
		htmlFor: "room-type-abbr-err",
		error: "A abreviação já está em uso.",
		children: <Input id="room-type-abbr-err" aria-invalid defaultValue="LAB" />,
	},
};

export const ProfileNameField: Story = {
	args: {
		label: "Nome do perfil",
		htmlFor: "profile-name",
		hint: "Ex: Professores, Técnicos, Alunos.",
		children: <Input id="profile-name" placeholder="Ex: Professores" />,
	},
};

export const BlockNameField: Story = {
	args: {
		label: "Nome do bloco",
		htmlFor: "block-name",
		hint: "Nome do bloco físico do campus.",
		children: <Input id="block-name" placeholder="Ex: Bloco A" />,
	},
};

// ── Disabled ──────────────────────────────────────────────────────────────────

export const DisabledField: Story = {
	args: {
		label: "Email",
		htmlFor: "email-disabled",
		hint: "Este campo não pode ser alterado.",
		children: (
			<Input
				id="email-disabled"
				type="email"
				disabled
				defaultValue="admin@ifsp.edu.br"
			/>
		),
	},
	parameters: {
		docs: {
			description: {
				story: "Campo desabilitado — cursor not-allowed e opacidade reduzida.",
			},
		},
	},
};

// ── Interativo ────────────────────────────────────────────────────────────────

export const Interactive: Story = {
	render: () => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [value, setValue] = useState("");
		const error =
			value.length > 0 && value.length < 3
				? "O nome deve ter pelo menos 3 caracteres."
				: undefined;
		const hint = !error ? "Mínimo de 3 caracteres." : undefined;

		return (
			<div className="w-80">
				<FormField
					label="Nome"
					htmlFor="interactive-name"
					error={error}
					hint={hint}
				>
					<Input
						id="interactive-name"
						placeholder="Digite o nome..."
						value={value}
						onChange={(e) => setValue(e.target.value)}
						aria-invalid={!!error}
					/>
				</FormField>
			</div>
		);
	},
	parameters: {
		docs: {
			description: {
				story:
					"Exemplo interativo: validação em tempo real — erro aparece quando há menos de 3 caracteres.",
			},
		},
	},
	decorators: [],
};

// ── Formulário completo ───────────────────────────────────────────────────────

export const CompleteForm: Story = {
	render: () => (
		<div className="w-80 flex flex-col gap-4 p-6 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
			<h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
				Novo usuário
			</h2>

			<FormField label="Nome" htmlFor="cf-name" hint="Nome completo.">
				<Input id="cf-name" placeholder="Ex: João Silva" />
			</FormField>

			<FormField
				label="Email"
				htmlFor="cf-email"
				hint="Email institucional para login."
			>
				<Input id="cf-email" type="email" placeholder="seu@ifsp.edu.br" />
			</FormField>

			<FormField
				label="Senha"
				htmlFor="cf-pass"
				error="A senha deve ter pelo menos 8 caracteres."
			>
				<Input id="cf-pass" type="password" aria-invalid defaultValue="123" />
			</FormField>
		</div>
	),
	decorators: [],
	parameters: {
		docs: {
			description: {
				story:
					"Composição de múltiplos FormFields formando o formulário de cadastro de usuário.",
			},
		},
	},
};

export const AllStates: Story = {
	render: () => (
		<div className="w-80 flex flex-col gap-4">
			<FormField label="Sem texto auxiliar" htmlFor="as-none">
				<Input id="as-none" placeholder="Campo padrão" />
			</FormField>

			<FormField
				label="Com dica"
				htmlFor="as-hint"
				hint="Texto de ajuda abaixo do campo."
			>
				<Input id="as-hint" placeholder="Campo com dica" />
			</FormField>

			<FormField
				label="Com erro"
				htmlFor="as-error"
				error="Mensagem de erro de validação."
			>
				<Input id="as-error" aria-invalid placeholder="Campo com erro" />
			</FormField>

			<FormField
				label="Desabilitado"
				htmlFor="as-disabled"
				hint="Não editável."
			>
				<Input id="as-disabled" disabled defaultValue="Valor fixo" />
			</FormField>
		</div>
	),
	decorators: [],
	parameters: {
		docs: {
			description: {
				story:
					"Todos os estados do FormField em sequência: padrão, com dica, com erro e desabilitado.",
			},
		},
	},
};
