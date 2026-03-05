import{j as e}from"./jsx-runtime-u17CrQMm.js";import{B as a}from"./badge-BpFQ4Lat.js";import"./index-CdJFUDDL.js";import"./utils-CBfrqCZ4.js";const f={title:"UI/Badge",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","secondary","destructive","outline"]},children:{control:"text"}},args:{children:"Badge"}},r={args:{variant:"default"}},s={args:{variant:"secondary",children:"Secondary"}},n={args:{variant:"destructive",children:"Erro"}},t={args:{variant:"outline",children:"Outline"}},c={args:{children:"TI"}},i={args:{children:"Laboratório de Informática"}},o={args:{children:"42"}},d={args:{children:"0"}},l={args:{variant:"outline",children:"LAB"},parameters:{docs:{description:{story:"Usado nos cards de sala para exibir a abreviação do tipo."}}}},m={args:{children:"12"},parameters:{docs:{description:{story:"Usado nos TabButtons para indicar quantidade de itens."}}}},p={render:()=>e.jsx(a,{className:"bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-100",children:"5"}),parameters:{docs:{description:{story:"Estilo de badge inativa dentro de TabButton."}}}},u={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-3 items-center",children:[e.jsx(a,{variant:"default",children:"Default"}),e.jsx(a,{variant:"secondary",children:"Secondary"}),e.jsx(a,{variant:"destructive",children:"Destructive"}),e.jsx(a,{variant:"outline",children:"Outline"})]})},g={render:()=>e.jsxs("div",{className:"flex flex-col gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-sm text-zinc-600",children:"Status:"}),e.jsx(a,{variant:"default",children:"Ativo"}),e.jsx(a,{variant:"destructive",children:"Inativo"}),e.jsx(a,{variant:"secondary",children:"Pendente"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-sm text-zinc-600",children:"Tipo de sala:"}),e.jsx(a,{variant:"outline",children:"LAB"}),e.jsx(a,{variant:"outline",children:"SALA"}),e.jsx(a,{variant:"outline",children:"AUD"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-sm text-zinc-600",children:"Contadores:"}),e.jsx(a,{children:"1"}),e.jsx(a,{children:"12"}),e.jsx(a,{children:"99+"})]})]})};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "default"
  }
}`,...r.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "secondary",
    children: "Secondary"
  }
}`,...s.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "destructive",
    children: "Erro"
  }
}`,...n.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "outline",
    children: "Outline"
  }
}`,...t.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    children: "TI"
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    children: "Laboratório de Informática"
  }
}`,...i.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    children: "42"
  }
}`,...o.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    children: "0"
  }
}`,...d.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "outline",
    children: "LAB"
  },
  parameters: {
    docs: {
      description: {
        story: "Usado nos cards de sala para exibir a abreviação do tipo."
      }
    }
  }
}`,...l.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    children: "12"
  },
  parameters: {
    docs: {
      description: {
        story: "Usado nos TabButtons para indicar quantidade de itens."
      }
    }
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <Badge className="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-100">
            5
        </Badge>,
  parameters: {
    docs: {
      description: {
        story: "Estilo de badge inativa dentro de TabButton."
      }
    }
  }
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3 items-center">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
        </div>
}`,...u.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-4">
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
}`,...g.parameters?.docs?.source}}};const S=["Default","Secondary","Destructive","Outline","ShortText","LongText","Numeric","Zero","RoomType","ActiveTab","InactiveTab","AllVariants","ContextExamples"];export{m as ActiveTab,u as AllVariants,g as ContextExamples,r as Default,n as Destructive,p as InactiveTab,i as LongText,o as Numeric,t as Outline,l as RoomType,s as Secondary,c as ShortText,d as Zero,S as __namedExportsOrder,f as default};
