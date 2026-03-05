import{j as e}from"./jsx-runtime-u17CrQMm.js";function s({title:u,subtitle:g}){return e.jsxs("div",{className:"flex flex-col",children:[e.jsx("h1",{className:"text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100",children:u}),g&&e.jsx("p",{className:"text-sm text-zinc-400 dark:text-zinc-500",children:g})]})}s.__docgenInfo={description:"",methods:[],displayName:"CrudPageHeader",props:{title:{required:!0,tsType:{name:"string"},description:""},subtitle:{required:!1,tsType:{name:"string"},description:""}}};const x={title:"UI/CrudPageHeader",component:s,parameters:{layout:"padded"},tags:["autodocs"],argTypes:{title:{control:"text"},subtitle:{control:"text"}},args:{title:"Usuários e Perfis"},decorators:[u=>e.jsx("div",{className:"max-w-2xl",children:e.jsx(u,{})})]},a={args:{title:"Usuários e Perfis"}},o={args:{title:"Usuários e Perfis",subtitle:"Gerencie os usuários e perfis de acesso do sistema."}},r={args:{title:"Usuários e Perfis",subtitle:"Gerencie os usuários e perfis de acesso do sistema."},parameters:{docs:{description:{story:"Cabeçalho usado na página de gerenciamento de usuários."}}}},t={args:{title:"Salas e Blocos",subtitle:"Gerencie as salas e blocos cadastrados no sistema."},parameters:{docs:{description:{story:"Cabeçalho usado na página de gerenciamento de salas."}}}},i={args:{title:"Perfis de Acesso",subtitle:"Configure os perfis e permissões de acesso às salas."}},n={args:{title:"Tipos de Sala",subtitle:"Categorias usadas para classificar as salas cadastradas."}},c={args:{title:"Blocos",subtitle:"Blocos físicos que agrupam as salas do campus."}},l={args:{title:"Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente"}},d={args:{title:"Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente",subtitle:"Controle total sobre os espaços físicos do campus, incluindo configuração de acesso, biometria e RFID por sala."}},p={args:{title:"Salas"}},m={render:()=>e.jsxs("div",{className:"flex flex-col gap-8 max-w-2xl",children:[e.jsxs("div",{className:"border-b pb-4",children:[e.jsx("p",{className:"text-xs text-zinc-400 uppercase tracking-wider mb-3",children:"Só título"}),e.jsx(s,{title:"Usuários e Perfis"})]}),e.jsxs("div",{className:"border-b pb-4",children:[e.jsx("p",{className:"text-xs text-zinc-400 uppercase tracking-wider mb-3",children:"Título + subtítulo"}),e.jsx(s,{title:"Usuários e Perfis",subtitle:"Gerencie os usuários e perfis de acesso do sistema."})]}),e.jsxs("div",{className:"border-b pb-4",children:[e.jsx("p",{className:"text-xs text-zinc-400 uppercase tracking-wider mb-3",children:"Título longo"}),e.jsx(s,{title:"Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-xs text-zinc-400 uppercase tracking-wider mb-3",children:"Título longo + subtítulo longo"}),e.jsx(s,{title:"Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente",subtitle:"Controle total sobre os espaços físicos do campus, incluindo configuração de acesso, biometria e RFID por sala."})]})]}),parameters:{docs:{description:{story:"Grade mostrando todas as combinações possíveis do CrudPageHeader."}}},decorators:[]};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Usuários e Perfis"
  }
}`,...a.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Usuários e Perfis",
    subtitle: "Gerencie os usuários e perfis de acesso do sistema."
  }
}`,...o.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Usuários e Perfis",
    subtitle: "Gerencie os usuários e perfis de acesso do sistema."
  },
  parameters: {
    docs: {
      description: {
        story: "Cabeçalho usado na página de gerenciamento de usuários."
      }
    }
  }
}`,...r.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Salas e Blocos",
    subtitle: "Gerencie as salas e blocos cadastrados no sistema."
  },
  parameters: {
    docs: {
      description: {
        story: "Cabeçalho usado na página de gerenciamento de salas."
      }
    }
  }
}`,...t.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Perfis de Acesso",
    subtitle: "Configure os perfis e permissões de acesso às salas."
  }
}`,...i.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Tipos de Sala",
    subtitle: "Categorias usadas para classificar as salas cadastradas."
  }
}`,...n.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Blocos",
    subtitle: "Blocos físicos que agrupam as salas do campus."
  }
}`,...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente"
  }
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente",
    subtitle: "Controle total sobre os espaços físicos do campus, incluindo configuração de acesso, biometria e RFID por sala."
  }
}`,...d.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    title: "Salas"
  }
}`,...p.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-8 max-w-2xl">
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
                <CrudPageHeader title="Usuários e Perfis" subtitle="Gerencie os usuários e perfis de acesso do sistema." />
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
                <CrudPageHeader title="Gerenciamento Completo de Salas, Blocos e Tipos de Ambiente" subtitle="Controle total sobre os espaços físicos do campus, incluindo configuração de acesso, biometria e RFID por sala." />
            </div>
        </div>,
  parameters: {
    docs: {
      description: {
        story: "Grade mostrando todas as combinações possíveis do CrudPageHeader."
      }
    }
  },
  decorators: []
}`,...m.parameters?.docs?.source}}};const f=["TitleOnly","WithSubtitle","UsersPage","RoomsPage","ProfilesPage","RoomTypesSection","BlocksSection","LongTitle","LongTitleWithSubtitle","ShortTitle","AllVariants"];export{m as AllVariants,c as BlocksSection,l as LongTitle,d as LongTitleWithSubtitle,i as ProfilesPage,n as RoomTypesSection,t as RoomsPage,p as ShortTitle,a as TitleOnly,r as UsersPage,o as WithSubtitle,f as __namedExportsOrder,x as default};
