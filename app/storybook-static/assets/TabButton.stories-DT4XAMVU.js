import{j as e}from"./jsx-runtime-u17CrQMm.js";import{B as k}from"./badge-BpFQ4Lat.js";import{c as T}from"./utils-CBfrqCZ4.js";import"./index-CdJFUDDL.js";function a({active:v,onClick:f,label:g,count:x}){return e.jsxs("button",{type:"button",onClick:f,className:`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${v?"border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100":"border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`,children:[g,e.jsx(k,{className:T("bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-100",v&&"bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-900"),children:x})]})}a.__docgenInfo={description:"",methods:[],displayName:"TabButton",props:{active:{required:!0,tsType:{name:"boolean"},description:""},onClick:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},label:{required:!0,tsType:{name:"string"},description:""},count:{required:!0,tsType:{name:"number"},description:""}}};const{fn:r}=__STORYBOOK_MODULE_TEST__,A={title:"UI/TabButton",component:a,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{active:{control:"boolean"},label:{control:"text"},count:{control:"number"},onClick:{action:"clicked"}},args:{onClick:r(),label:"Usuários",count:10,active:!1}},o={args:{active:!1,label:"Usuários",count:10}},s={args:{active:!0,label:"Usuários",count:10}},t={args:{active:!1,label:"Perfis",count:0}},n={args:{active:!0,label:"Perfis",count:0}},c={args:{active:!1,label:"Salas",count:999}},i={args:{active:!0,label:"Salas",count:999}},l={args:{active:!1,label:"Tipos de Sala",count:7}},u={args:{active:!0,label:"Tipos de Sala",count:7}},d={render:()=>e.jsxs("div",{className:"flex border-b",children:[e.jsx(a,{active:!0,label:"Usuários",count:24,onClick:r()}),e.jsx(a,{active:!1,label:"Perfis",count:5,onClick:r()})]}),parameters:{docs:{description:{story:"Grupo de tabs da página de usuários com o primeiro tab ativo."}}}},b={render:()=>e.jsxs("div",{className:"flex border-b",children:[e.jsx(a,{active:!0,label:"Salas",count:48,onClick:r()}),e.jsx(a,{active:!1,label:"Blocos",count:6,onClick:r()}),e.jsx(a,{active:!1,label:"Tipos",count:4,onClick:r()})]}),parameters:{docs:{description:{story:"Grupo de tabs da página de salas administrativo com três abas."}}}},p={render:()=>e.jsxs("div",{className:"flex border-b",children:[e.jsx(a,{active:!1,label:"Salas",count:48,onClick:r()}),e.jsx(a,{active:!0,label:"Blocos",count:6,onClick:r()}),e.jsx(a,{active:!1,label:"Tipos",count:4,onClick:r()})]}),parameters:{docs:{description:{story:"Grupo de tabs com o segundo tab (Blocos) ativo."}}}},m={render:()=>e.jsxs("div",{className:"flex border-b",children:[e.jsx(a,{active:!1,label:"Aba 1",count:3,onClick:r()}),e.jsx(a,{active:!1,label:"Aba 2",count:12,onClick:r()}),e.jsx(a,{active:!1,label:"Aba 3",count:0,onClick:r()})]})};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    active: false,
    label: "Usuários",
    count: 10
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    active: true,
    label: "Usuários",
    count: 10
  }
}`,...s.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    active: false,
    label: "Perfis",
    count: 0
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    active: true,
    label: "Perfis",
    count: 0
  }
}`,...n.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    active: false,
    label: "Salas",
    count: 999
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    active: true,
    label: "Salas",
    count: 999
  }
}`,...i.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    active: false,
    label: "Tipos de Sala",
    count: 7
  }
}`,...l.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    active: true,
    label: "Tipos de Sala",
    count: 7
  }
}`,...u.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex border-b">
            <TabButton active label="Usuários" count={24} onClick={fn()} />
            <TabButton active={false} label="Perfis" count={5} onClick={fn()} />
        </div>,
  parameters: {
    docs: {
      description: {
        story: "Grupo de tabs da página de usuários com o primeiro tab ativo."
      }
    }
  }
}`,...d.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex border-b">
            <TabButton active label="Salas" count={48} onClick={fn()} />
            <TabButton active={false} label="Blocos" count={6} onClick={fn()} />
            <TabButton active={false} label="Tipos" count={4} onClick={fn()} />
        </div>,
  parameters: {
    docs: {
      description: {
        story: "Grupo de tabs da página de salas administrativo com três abas."
      }
    }
  }
}`,...b.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex border-b">
            <TabButton active={false} label="Salas" count={48} onClick={fn()} />
            <TabButton active label="Blocos" count={6} onClick={fn()} />
            <TabButton active={false} label="Tipos" count={4} onClick={fn()} />
        </div>,
  parameters: {
    docs: {
      description: {
        story: "Grupo de tabs com o segundo tab (Blocos) ativo."
      }
    }
  }
}`,...p.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex border-b">
            <TabButton active={false} label="Aba 1" count={3} onClick={fn()} />
            <TabButton active={false} label="Aba 2" count={12} onClick={fn()} />
            <TabButton active={false} label="Aba 3" count={0} onClick={fn()} />
        </div>
}`,...m.parameters?.docs?.source}}};const z=["Default","Active","InactiveZero","ActiveZero","LargeCount","ActiveLargeCount","LongLabel","ActiveLongLabel","UsersTabGroup","RoomsTabGroup","RoomsTabGroupBlocksActive","AllInactive"];export{s as Active,i as ActiveLargeCount,u as ActiveLongLabel,n as ActiveZero,m as AllInactive,o as Default,t as InactiveZero,c as LargeCount,l as LongLabel,b as RoomsTabGroup,p as RoomsTabGroupBlocksActive,d as UsersTabGroup,z as __namedExportsOrder,A as default};
