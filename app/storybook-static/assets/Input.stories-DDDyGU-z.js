import{j as e}from"./jsx-runtime-u17CrQMm.js";import{r as I}from"./iframe-v2_mmyJ2.js";import{I as a}from"./input-CkROG1gb.js";import{c as w}from"./createLucideIcon-CVovXVo7.js";import{S as z}from"./search-BjANR4og.js";import{M as k}from"./mail-DOUsqnAj.js";import"./preload-helper-PPVm8Dsz.js";import"./utils-CBfrqCZ4.js";const V=[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]],E=w("eye-off",V);const C=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],F=w("eye",C);const D=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],M=w("lock",D),J={title:"UI/Input",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{type:{control:"select",options:["text","email","password","number","search","tel","url"]},placeholder:{control:"text"},disabled:{control:"boolean"},"aria-invalid":{control:"boolean"}},args:{placeholder:"Digite aqui..."},decorators:[r=>e.jsx("div",{className:"w-80",children:e.jsx(r,{})})]},s={},o={args:{defaultValue:"Valor preenchido"}},t={args:{placeholder:"Buscar salas, blocos..."}},n={args:{disabled:!0,defaultValue:"Campo desabilitado"}},l={args:{disabled:!0,placeholder:"Campo desabilitado"}},c={args:{"aria-invalid":!0,defaultValue:"Valor inválido"}},i={args:{"aria-invalid":!0,placeholder:"Campo com erro"}},d={args:{type:"email",placeholder:"seu@email.com"}},m={args:{type:"password",placeholder:"Senha",defaultValue:"senha123"}},p={args:{type:"number",placeholder:"0",min:0,max:100}},u={args:{type:"search",placeholder:"Buscar..."}},h={render:r=>e.jsxs("div",{className:"relative w-80",children:[e.jsx(z,{className:"pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"}),e.jsx(a,{...r,className:"pl-9"})]}),args:{placeholder:"Buscar salas..."}},x={render:r=>e.jsxs("div",{className:"relative w-80",children:[e.jsx(k,{className:"pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"}),e.jsx(a,{...r,type:"email",className:"pl-9"})]}),args:{placeholder:"seu@email.com"}},b={render:r=>{const[N,S]=I.useState(!1);return e.jsxs("div",{className:"relative w-80",children:[e.jsx(M,{className:"pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"}),e.jsx(a,{...r,type:N?"text":"password",className:"pl-9 pr-10"}),e.jsx("button",{type:"button",onClick:()=>S(j=>!j),className:"absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors","aria-label":N?"Ocultar senha":"Mostrar senha",children:N?e.jsx(E,{className:"size-4"}):e.jsx(F,{className:"size-4"})})]})},args:{placeholder:"Senha",defaultValue:"minha-senha-secreta"}},g={render:()=>e.jsxs("div",{className:"relative w-80",children:[e.jsx(z,{className:"pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"}),e.jsx(a,{placeholder:"Buscar por sala ou bloco…",className:"pl-9 pr-16 bg-white"}),e.jsxs("div",{className:"pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1",children:[e.jsx("kbd",{className:"inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-600",children:"Ctrl"}),e.jsx("kbd",{className:"inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-600",children:"K"})]})]}),parameters:{docs:{description:{story:"Composição usada na barra de busca principal da página de monitoramento."}}}},v={render:()=>e.jsxs("div",{className:"flex flex-col gap-1.5 w-80",children:[e.jsx("label",{htmlFor:"nome",className:"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",children:"Nome completo"}),e.jsx(a,{id:"nome",placeholder:"Ex: João Silva"}),e.jsx("span",{className:"text-xs text-muted-foreground",children:"Informe o nome como aparece no documento."})]})},f={render:()=>e.jsxs("div",{className:"flex flex-col gap-1.5 w-80",children:[e.jsx("label",{htmlFor:"email-err",className:"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",children:"Email"}),e.jsx(a,{id:"email-err",type:"email","aria-invalid":!0,defaultValue:"email-invalido"}),e.jsx("span",{className:"text-xs text-destructive",children:"Informe um endereço de e-mail válido."})]})},y={render:()=>e.jsxs("div",{className:"flex flex-col gap-3 w-80",children:[e.jsx(a,{placeholder:"Padrão (vazio)"}),e.jsx(a,{defaultValue:"Com valor"}),e.jsx(a,{placeholder:"Desabilitado",disabled:!0}),e.jsx(a,{defaultValue:"Desabilitado com valor",disabled:!0}),e.jsx(a,{"aria-invalid":!0,placeholder:"Inválido (vazio)"}),e.jsx(a,{"aria-invalid":!0,defaultValue:"Inválido com valor"})]})};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:"{}",...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    defaultValue: "Valor preenchido"
  }
}`,...o.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    placeholder: "Buscar salas, blocos..."
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: "Campo desabilitado"
  }
}`,...n.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    placeholder: "Campo desabilitado"
  }
}`,...l.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    "aria-invalid": true,
    defaultValue: "Valor inválido"
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    "aria-invalid": true,
    placeholder: "Campo com erro"
  }
}`,...i.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    type: "email",
    placeholder: "seu@email.com"
  }
}`,...d.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    type: "password",
    placeholder: "Senha",
    defaultValue: "senha123"
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    type: "number",
    placeholder: "0",
    min: 0,
    max: 100
  }
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    type: "search",
    placeholder: "Buscar..."
  }
}`,...u.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  render: args => <div className="relative w-80">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <Input {...args} className="pl-9" />
    </div>,
  args: {
    placeholder: "Buscar salas..."
  }
}`,...h.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: args => <div className="relative w-80">
      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <Input {...args} type="email" className="pl-9" />
    </div>,
  args: {
    placeholder: "seu@email.com"
  }
}`,...x.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: args => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [show, setShow] = useState(false);
    return <div className="relative w-80">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input {...args} type={show ? "text" : "password"} className="pl-9 pr-10" />
        <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors" aria-label={show ? "Ocultar senha" : "Mostrar senha"}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>;
  },
  args: {
    placeholder: "Senha",
    defaultValue: "minha-senha-secreta"
  }
}`,...b.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <div className="relative w-80">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <Input placeholder="Buscar por sala ou bloco…" className="pl-9 pr-16 bg-white" />
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-600">
          Ctrl
        </kbd>
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-600">
          K
        </kbd>
      </div>
    </div>,
  parameters: {
    docs: {
      description: {
        story: "Composição usada na barra de busca principal da página de monitoramento."
      }
    }
  }
}`,...g.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-1.5 w-80">
      <label htmlFor="nome" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Nome completo
      </label>
      <Input id="nome" placeholder="Ex: João Silva" />
      <span className="text-xs text-muted-foreground">
        Informe o nome como aparece no documento.
      </span>
    </div>
}`,...v.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-1.5 w-80">
      <label htmlFor="email-err" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Email
      </label>
      <Input id="email-err" type="email" aria-invalid defaultValue="email-invalido" />
      <span className="text-xs text-destructive">
        Informe um endereço de e-mail válido.
      </span>
    </div>
}`,...f.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-3 w-80">
      <Input placeholder="Padrão (vazio)" />
      <Input defaultValue="Com valor" />
      <Input placeholder="Desabilitado" disabled />
      <Input defaultValue="Desabilitado com valor" disabled />
      <Input aria-invalid placeholder="Inválido (vazio)" />
      <Input aria-invalid defaultValue="Inválido com valor" />
    </div>
}`,...y.parameters?.docs?.source}}};const K=["Default","WithValue","Placeholder","Disabled","DisabledEmpty","Invalid","InvalidEmpty","Email","Password","Number","SearchType","WithLeadingIcon","WithEmailIcon","PasswordToggle","SearchToolbarLike","FormFieldLike","FormFieldWithError","AllStates"];export{y as AllStates,s as Default,n as Disabled,l as DisabledEmpty,d as Email,v as FormFieldLike,f as FormFieldWithError,c as Invalid,i as InvalidEmpty,p as Number,m as Password,b as PasswordToggle,t as Placeholder,g as SearchToolbarLike,u as SearchType,x as WithEmailIcon,h as WithLeadingIcon,o as WithValue,K as __namedExportsOrder,J as default};
