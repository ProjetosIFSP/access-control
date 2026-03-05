import{j as e}from"./jsx-runtime-u17CrQMm.js";import{r as I}from"./iframe-v2_mmyJ2.js";import{r as B}from"./index-DgFKcRs-.js";import{c as L}from"./index-BVJrx32b.js";import{c as T}from"./utils-CBfrqCZ4.js";import{I as r}from"./input-CkROG1gb.js";import"./preload-helper-PPVm8Dsz.js";B();var _=["a","button","div","form","h2","h3","img","input","label","li","nav","ol","p","select","span","svg","ul"],O=_.reduce((a,o)=>{const i=L(`Primitive.${o}`),n=I.forwardRef((l,A)=>{const{asChild:P,...V}=l,k=P?i:o;return typeof window<"u"&&(window[Symbol.for("radix-ui")]=!0),e.jsx(k,{...V,ref:A})});return n.displayName=`Primitive.${o}`,{...a,[o]:n}},{}),R="Label",D=I.forwardRef((a,o)=>e.jsx(O.label,{...a,ref:o,onMouseDown:i=>{i.target.closest("button, input, select, textarea")||(a.onMouseDown?.(i),!i.defaultPrevented&&i.detail>1&&i.preventDefault())}}));D.displayName=R;var M=D;function q({className:a,...o}){return e.jsx(M,{"data-slot":"label",className:T("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",a),...o})}q.__docgenInfo={description:"",methods:[],displayName:"Label"};function s({label:a,htmlFor:o,error:i,hint:n,children:l,className:A}){return e.jsxs("div",{className:T("flex flex-col gap-1.5",A),children:[e.jsx(q,{htmlFor:o,children:a}),l,i?e.jsx("span",{className:"text-xs text-destructive",children:i}):n?e.jsx("span",{className:"text-xs text-muted-foreground",children:n}):null]})}s.__docgenInfo={description:"",methods:[],displayName:"FormField",props:{label:{required:!0,tsType:{name:"string"},description:"The label text displayed above the input"},htmlFor:{required:!0,tsType:{name:"string"},description:"The htmlFor / id linking label to input"},error:{required:!1,tsType:{name:"string"},description:"Error message to display below the input"},hint:{required:!1,tsType:{name:"string"},description:"Optional hint text displayed below the input (hidden if error is shown)"},children:{required:!0,tsType:{name:"ReactNode"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};function C({className:a,...o}){return e.jsx("textarea",{"data-slot":"textarea",className:T("border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",a),...o})}C.__docgenInfo={description:"",methods:[],displayName:"Textarea"};const{fn:K}=__STORYBOOK_MODULE_TEST__,Y={title:"UI/FormField",component:s,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{label:{control:"text"},htmlFor:{control:"text"},error:{control:"text"},hint:{control:"text"}},args:{label:"Nome completo",htmlFor:"nome",children:e.jsx(r,{id:"nome",placeholder:"Ex: João Silva"})},decorators:[a=>e.jsx("div",{className:"w-80",children:e.jsx(a,{})})]},t={},d={args:{label:"Nome completo",htmlFor:"nome-hint",hint:"Informe o nome como aparece no documento.",children:e.jsx(r,{id:"nome-hint",placeholder:"Ex: João Silva"})}},c={args:{label:"Email",htmlFor:"email-error",error:"Informe um endereço de e-mail válido.",children:e.jsx(r,{id:"email-error",type:"email","aria-invalid":!0,defaultValue:"email-invalido"})},parameters:{docs:{description:{story:"Quando `error` está definido, ele tem prioridade sobre `hint` e é exibido em vermelho abaixo do campo."}}}},m={args:{label:"Email",htmlFor:"email-both",hint:"Será usado para login.",error:"Este email já está cadastrado.",children:e.jsx(r,{id:"email-both",type:"email","aria-invalid":!0,defaultValue:"joao@ifsp.edu.br"})},parameters:{docs:{description:{story:"Quando `error` e `hint` estão ambos definidos, apenas o `error` é exibido."}}}},p={args:{label:"Abreviação",htmlFor:"abbr-clean",children:e.jsx(r,{id:"abbr-clean",placeholder:"Ex: LAB"})},parameters:{docs:{description:{story:"Campo sem texto auxiliar — apenas label + input."}}}},u={args:{label:"Email institucional",htmlFor:"email-field",hint:"Será usado para login e notificações.",children:e.jsx(r,{id:"email-field",type:"email",placeholder:"seu@ifsp.edu.br"})}},h={args:{label:"Senha",htmlFor:"password-field",hint:"Mínimo de 8 caracteres.",children:e.jsx(r,{id:"password-field",type:"password",placeholder:"••••••••"})}},b={args:{label:"Descrição",htmlFor:"descricao-field",hint:"Descreva brevemente o perfil de acesso.",children:e.jsx(C,{id:"descricao-field",placeholder:"Ex: Perfil para professores do bloco B...",rows:3})},parameters:{docs:{description:{story:"FormField funciona com qualquer elemento filho — aqui com Textarea."}}}},x={args:{label:"Descrição",htmlFor:"descricao-error",error:"A descrição não pode estar vazia.",children:e.jsx(C,{id:"descricao-error","aria-invalid":!0,placeholder:"Ex: Perfil para professores...",rows:3})}},f={args:{label:"Nome",htmlFor:"user-name",hint:"Nome completo do usuário.",children:e.jsx(r,{id:"user-name",placeholder:"Ex: Maria Oliveira"})},parameters:{docs:{description:{story:"Campo de nome usado no formulário de criação/edição de usuário."}}}},F={args:{label:"Nome da sala",htmlFor:"room-name",hint:"Identificação da sala no campus.",children:e.jsx(r,{id:"room-name",placeholder:"Ex: Sala 101"})},parameters:{docs:{description:{story:"Campo de nome da sala no formulário de cadastro de sala."}}}},g={args:{label:"Abreviação",htmlFor:"room-type-abbr",hint:"Sigla curta exibida nos cards de sala (ex: LAB, SALA, AUD).",children:e.jsx(r,{id:"room-type-abbr",placeholder:"Ex: LAB"})}},v={args:{label:"Abreviação",htmlFor:"room-type-abbr-err",error:"A abreviação já está em uso.",children:e.jsx(r,{id:"room-type-abbr-err","aria-invalid":!0,defaultValue:"LAB"})}},y={args:{label:"Nome do perfil",htmlFor:"profile-name",hint:"Ex: Professores, Técnicos, Alunos.",children:e.jsx(r,{id:"profile-name",placeholder:"Ex: Professores"})}},E={args:{label:"Nome do bloco",htmlFor:"block-name",hint:"Nome do bloco físico do campus.",children:e.jsx(r,{id:"block-name",placeholder:"Ex: Bloco A"})}},N={args:{label:"Email",htmlFor:"email-disabled",hint:"Este campo não pode ser alterado.",children:e.jsx(r,{id:"email-disabled",type:"email",disabled:!0,defaultValue:"admin@ifsp.edu.br"})},parameters:{docs:{description:{story:"Campo desabilitado — cursor not-allowed e opacidade reduzida."}}}},j={render:()=>{const[a,o]=I.useState(""),i=a.length>0&&a.length<3?"O nome deve ter pelo menos 3 caracteres.":void 0,n=i?void 0:"Mínimo de 3 caracteres.";return e.jsx("div",{className:"w-80",children:e.jsx(s,{label:"Nome",htmlFor:"interactive-name",error:i,hint:n,children:e.jsx(r,{id:"interactive-name",placeholder:"Digite o nome...",value:a,onChange:l=>o(l.target.value),"aria-invalid":!!i})})})},parameters:{docs:{description:{story:"Exemplo interativo: validação em tempo real — erro aparece quando há menos de 3 caracteres."}}},decorators:[]},S={render:()=>e.jsxs("div",{className:"w-80 flex flex-col gap-4 p-6 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm",children:[e.jsx("h2",{className:"text-base font-semibold text-zinc-900 dark:text-zinc-100",children:"Novo usuário"}),e.jsx(s,{label:"Nome",htmlFor:"cf-name",hint:"Nome completo.",children:e.jsx(r,{id:"cf-name",placeholder:"Ex: João Silva"})}),e.jsx(s,{label:"Email",htmlFor:"cf-email",hint:"Email institucional para login.",children:e.jsx(r,{id:"cf-email",type:"email",placeholder:"seu@ifsp.edu.br"})}),e.jsx(s,{label:"Senha",htmlFor:"cf-pass",error:"A senha deve ter pelo menos 8 caracteres.",children:e.jsx(r,{id:"cf-pass",type:"password","aria-invalid":!0,defaultValue:"123"})})]}),decorators:[],parameters:{docs:{description:{story:"Composição de múltiplos FormFields formando o formulário de cadastro de usuário."}}}},w={render:()=>e.jsxs("div",{className:"w-80 flex flex-col gap-4",children:[e.jsx(s,{label:"Sem texto auxiliar",htmlFor:"as-none",children:e.jsx(r,{id:"as-none",placeholder:"Campo padrão"})}),e.jsx(s,{label:"Com dica",htmlFor:"as-hint",hint:"Texto de ajuda abaixo do campo.",children:e.jsx(r,{id:"as-hint",placeholder:"Campo com dica"})}),e.jsx(s,{label:"Com erro",htmlFor:"as-error",error:"Mensagem de erro de validação.",children:e.jsx(r,{id:"as-error","aria-invalid":!0,placeholder:"Campo com erro"})}),e.jsx(s,{label:"Desabilitado",htmlFor:"as-disabled",hint:"Não editável.",children:e.jsx(r,{id:"as-disabled",disabled:!0,defaultValue:"Valor fixo"})})]}),decorators:[],parameters:{docs:{description:{story:"Todos os estados do FormField em sequência: padrão, com dica, com erro e desabilitado."}}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Nome completo",
    htmlFor: "nome-hint",
    hint: "Informe o nome como aparece no documento.",
    children: <Input id="nome-hint" placeholder="Ex: João Silva" />
  }
}`,...d.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Email",
    htmlFor: "email-error",
    error: "Informe um endereço de e-mail válido.",
    children: <Input id="email-error" type="email" aria-invalid defaultValue="email-invalido" />
  },
  parameters: {
    docs: {
      description: {
        story: "Quando \`error\` está definido, ele tem prioridade sobre \`hint\` e é exibido em vermelho abaixo do campo."
      }
    }
  }
}`,...c.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Email",
    htmlFor: "email-both",
    hint: "Será usado para login.",
    error: "Este email já está cadastrado.",
    children: <Input id="email-both" type="email" aria-invalid defaultValue="joao@ifsp.edu.br" />
  },
  parameters: {
    docs: {
      description: {
        story: "Quando \`error\` e \`hint\` estão ambos definidos, apenas o \`error\` é exibido."
      }
    }
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Abreviação",
    htmlFor: "abbr-clean",
    children: <Input id="abbr-clean" placeholder="Ex: LAB" />
  },
  parameters: {
    docs: {
      description: {
        story: "Campo sem texto auxiliar — apenas label + input."
      }
    }
  }
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Email institucional",
    htmlFor: "email-field",
    hint: "Será usado para login e notificações.",
    children: <Input id="email-field" type="email" placeholder="seu@ifsp.edu.br" />
  }
}`,...u.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Senha",
    htmlFor: "password-field",
    hint: "Mínimo de 8 caracteres.",
    children: <Input id="password-field" type="password" placeholder="••••••••" />
  }
}`,...h.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Descrição",
    htmlFor: "descricao-field",
    hint: "Descreva brevemente o perfil de acesso.",
    children: <Textarea id="descricao-field" placeholder="Ex: Perfil para professores do bloco B..." rows={3} />
  },
  parameters: {
    docs: {
      description: {
        story: "FormField funciona com qualquer elemento filho — aqui com Textarea."
      }
    }
  }
}`,...b.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Descrição",
    htmlFor: "descricao-error",
    error: "A descrição não pode estar vazia.",
    children: <Textarea id="descricao-error" aria-invalid placeholder="Ex: Perfil para professores..." rows={3} />
  }
}`,...x.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Nome",
    htmlFor: "user-name",
    hint: "Nome completo do usuário.",
    children: <Input id="user-name" placeholder="Ex: Maria Oliveira" />
  },
  parameters: {
    docs: {
      description: {
        story: "Campo de nome usado no formulário de criação/edição de usuário."
      }
    }
  }
}`,...f.parameters?.docs?.source}}};F.parameters={...F.parameters,docs:{...F.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Nome da sala",
    htmlFor: "room-name",
    hint: "Identificação da sala no campus.",
    children: <Input id="room-name" placeholder="Ex: Sala 101" />
  },
  parameters: {
    docs: {
      description: {
        story: "Campo de nome da sala no formulário de cadastro de sala."
      }
    }
  }
}`,...F.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Abreviação",
    htmlFor: "room-type-abbr",
    hint: "Sigla curta exibida nos cards de sala (ex: LAB, SALA, AUD).",
    children: <Input id="room-type-abbr" placeholder="Ex: LAB" />
  }
}`,...g.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Abreviação",
    htmlFor: "room-type-abbr-err",
    error: "A abreviação já está em uso.",
    children: <Input id="room-type-abbr-err" aria-invalid defaultValue="LAB" />
  }
}`,...v.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Nome do perfil",
    htmlFor: "profile-name",
    hint: "Ex: Professores, Técnicos, Alunos.",
    children: <Input id="profile-name" placeholder="Ex: Professores" />
  }
}`,...y.parameters?.docs?.source}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Nome do bloco",
    htmlFor: "block-name",
    hint: "Nome do bloco físico do campus.",
    children: <Input id="block-name" placeholder="Ex: Bloco A" />
  }
}`,...E.parameters?.docs?.source}}};N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    label: "Email",
    htmlFor: "email-disabled",
    hint: "Este campo não pode ser alterado.",
    children: <Input id="email-disabled" type="email" disabled defaultValue="admin@ifsp.edu.br" />
  },
  parameters: {
    docs: {
      description: {
        story: "Campo desabilitado — cursor not-allowed e opacidade reduzida."
      }
    }
  }
}`,...N.parameters?.docs?.source}}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState("");
    const error = value.length > 0 && value.length < 3 ? "O nome deve ter pelo menos 3 caracteres." : undefined;
    const hint = !error ? "Mínimo de 3 caracteres." : undefined;
    return <div className="w-80">
                <FormField label="Nome" htmlFor="interactive-name" error={error} hint={hint}>
                    <Input id="interactive-name" placeholder="Digite o nome..." value={value} onChange={e => setValue(e.target.value)} aria-invalid={!!error} />
                </FormField>
            </div>;
  },
  parameters: {
    docs: {
      description: {
        story: "Exemplo interativo: validação em tempo real — erro aparece quando há menos de 3 caracteres."
      }
    }
  },
  decorators: []
}`,...j.parameters?.docs?.source}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-80 flex flex-col gap-4 p-6 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Novo usuário
            </h2>

            <FormField label="Nome" htmlFor="cf-name" hint="Nome completo.">
                <Input id="cf-name" placeholder="Ex: João Silva" />
            </FormField>

            <FormField label="Email" htmlFor="cf-email" hint="Email institucional para login.">
                <Input id="cf-email" type="email" placeholder="seu@ifsp.edu.br" />
            </FormField>

            <FormField label="Senha" htmlFor="cf-pass" error="A senha deve ter pelo menos 8 caracteres.">
                <Input id="cf-pass" type="password" aria-invalid defaultValue="123" />
            </FormField>
        </div>,
  decorators: [],
  parameters: {
    docs: {
      description: {
        story: "Composição de múltiplos FormFields formando o formulário de cadastro de usuário."
      }
    }
  }
}`,...S.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-80 flex flex-col gap-4">
            <FormField label="Sem texto auxiliar" htmlFor="as-none">
                <Input id="as-none" placeholder="Campo padrão" />
            </FormField>

            <FormField label="Com dica" htmlFor="as-hint" hint="Texto de ajuda abaixo do campo.">
                <Input id="as-hint" placeholder="Campo com dica" />
            </FormField>

            <FormField label="Com erro" htmlFor="as-error" error="Mensagem de erro de validação.">
                <Input id="as-error" aria-invalid placeholder="Campo com erro" />
            </FormField>

            <FormField label="Desabilitado" htmlFor="as-disabled" hint="Não editável.">
                <Input id="as-disabled" disabled defaultValue="Valor fixo" />
            </FormField>
        </div>,
  decorators: [],
  parameters: {
    docs: {
      description: {
        story: "Todos os estados do FormField em sequência: padrão, com dica, com erro e desabilitado."
      }
    }
  }
}`,...w.parameters?.docs?.source}}};const G=["Default","WithHint","WithError","ErrorOverridesHint","NoHelperText","EmailField","PasswordField","TextareaField","TextareaWithError","UserNameField","RoomNameField","RoomTypeAbbreviationField","RoomTypeAbbreviationError","ProfileNameField","BlockNameField","DisabledField","Interactive","CompleteForm","AllStates"];export{w as AllStates,E as BlockNameField,S as CompleteForm,t as Default,N as DisabledField,u as EmailField,m as ErrorOverridesHint,j as Interactive,p as NoHelperText,h as PasswordField,y as ProfileNameField,F as RoomNameField,v as RoomTypeAbbreviationError,g as RoomTypeAbbreviationField,b as TextareaField,x as TextareaWithError,f as UserNameField,c as WithError,d as WithHint,G as __namedExportsOrder,Y as default};
