import{j as i}from"./jsx-runtime-u17CrQMm.js";import{g as je}from"./iframe-v2_mmyJ2.js";import{B as Te}from"./badge-BpFQ4Lat.js";import{c as Me}from"./utils-CBfrqCZ4.js";import{c as Oe}from"./createLucideIcon-CVovXVo7.js";import"./preload-helper-PPVm8Dsz.js";import"./index-CdJFUDDL.js";const Ye=[["circle",{cx:"12",cy:"8",r:"5",key:"1hypcn"}],["path",{d:"M20 21a8 8 0 0 0-16 0",key:"rfgkzh"}]],Ce=Oe("user-round",Ye);var xe={exports:{}},Le=xe.exports,_e;function ke(){return _e||(_e=1,(function(l,K){(function(b,v){l.exports=v()})(Le,(function(){var b=1e3,v=6e4,w=36e5,y="millisecond",f="second",U="minute",N="hour",c="day",_="week",g="month",H="quarter",j="year",k="date",O="Invalid Date",V=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,J=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,Z={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(n){var r=["th","st","nd","rd"],e=n%100;return"["+n+(r[(e-20)%10]||r[e]||r[0])+"]"}},P=function(n,r,e){var a=String(n);return!a||a.length>=r?n:""+Array(r+1-a.length).join(e)+n},Y={s:P,z:function(n){var r=-n.utcOffset(),e=Math.abs(r),a=Math.floor(e/60),t=e%60;return(r<=0?"+":"-")+P(a,2,"0")+":"+P(t,2,"0")},m:function n(r,e){if(r.date()<e.date())return-n(e,r);var a=12*(e.year()-r.year())+(e.month()-r.month()),t=r.clone().add(a,g),s=e-t<0,o=r.clone().add(a+(s?-1:1),g);return+(-(a+(e-t)/(s?t-o:o-t))||0)},a:function(n){return n<0?Math.ceil(n)||0:Math.floor(n)},p:function(n){return{M:g,y:j,w:_,d:c,D:k,h:N,m:U,s:f,ms:y,Q:H}[n]||String(n||"").toLowerCase().replace(/s$/,"")},u:function(n){return n===void 0}},S="en",$={};$[S]=Z;var F="$isDayjsObject",C=function(n){return n instanceof ee||!(!n||!n[F])},X=function n(r,e,a){var t;if(!r)return S;if(typeof r=="string"){var s=r.toLowerCase();$[s]&&(t=s),e&&($[s]=e,t=s);var o=r.split("-");if(!t&&o.length>1)return n(o[0])}else{var d=r.name;$[d]=r,t=d}return!a&&t&&(S=t),t||!a&&S},p=function(n,r){if(C(n))return n.clone();var e=typeof r=="object"?r:{};return e.date=n,e.args=arguments,new ee(e)},u=Y;u.l=X,u.i=C,u.w=function(n,r){return p(n,{locale:r.$L,utc:r.$u,x:r.$x,$offset:r.$offset})};var ee=(function(){function n(e){this.$L=X(e.locale,null,!0),this.parse(e),this.$x=this.$x||e.x||{},this[F]=!0}var r=n.prototype;return r.parse=function(e){this.$d=(function(a){var t=a.date,s=a.utc;if(t===null)return new Date(NaN);if(u.u(t))return new Date;if(t instanceof Date)return new Date(t);if(typeof t=="string"&&!/Z$/i.test(t)){var o=t.match(V);if(o){var d=o[2]-1||0,m=(o[7]||"0").substring(0,3);return s?new Date(Date.UTC(o[1],d,o[3]||1,o[4]||0,o[5]||0,o[6]||0,m)):new Date(o[1],d,o[3]||1,o[4]||0,o[5]||0,o[6]||0,m)}}return new Date(t)})(e),this.init()},r.init=function(){var e=this.$d;this.$y=e.getFullYear(),this.$M=e.getMonth(),this.$D=e.getDate(),this.$W=e.getDay(),this.$H=e.getHours(),this.$m=e.getMinutes(),this.$s=e.getSeconds(),this.$ms=e.getMilliseconds()},r.$utils=function(){return u},r.isValid=function(){return this.$d.toString()!==O},r.isSame=function(e,a){var t=p(e);return this.startOf(a)<=t&&t<=this.endOf(a)},r.isAfter=function(e,a){return p(e)<this.startOf(a)},r.isBefore=function(e,a){return this.endOf(a)<p(e)},r.$g=function(e,a,t){return u.u(e)?this[a]:this.set(t,e)},r.unix=function(){return Math.floor(this.valueOf()/1e3)},r.valueOf=function(){return this.$d.getTime()},r.startOf=function(e,a){var t=this,s=!!u.u(a)||a,o=u.p(e),d=function(q,A){var z=u.w(t.$u?Date.UTC(t.$y,A,q):new Date(t.$y,A,q),t);return s?z:z.endOf(c)},m=function(q,A){return u.w(t.toDate()[q].apply(t.toDate("s"),(s?[0,0,0,0]:[23,59,59,999]).slice(A)),t)},h=this.$W,x=this.$M,D=this.$D,I="set"+(this.$u?"UTC":"");switch(o){case j:return s?d(1,0):d(31,11);case g:return s?d(1,x):d(0,x+1);case _:var L=this.$locale().weekStart||0,Q=(h<L?h+7:h)-L;return d(s?D-Q:D+(6-Q),x);case c:case k:return m(I+"Hours",0);case N:return m(I+"Minutes",1);case U:return m(I+"Seconds",2);case f:return m(I+"Milliseconds",3);default:return this.clone()}},r.endOf=function(e){return this.startOf(e,!1)},r.$set=function(e,a){var t,s=u.p(e),o="set"+(this.$u?"UTC":""),d=(t={},t[c]=o+"Date",t[k]=o+"Date",t[g]=o+"Month",t[j]=o+"FullYear",t[N]=o+"Hours",t[U]=o+"Minutes",t[f]=o+"Seconds",t[y]=o+"Milliseconds",t)[s],m=s===c?this.$D+(a-this.$W):a;if(s===g||s===j){var h=this.clone().set(k,1);h.$d[d](m),h.init(),this.$d=h.set(k,Math.min(this.$D,h.daysInMonth())).$d}else d&&this.$d[d](m);return this.init(),this},r.set=function(e,a){return this.clone().$set(e,a)},r.get=function(e){return this[u.p(e)]()},r.add=function(e,a){var t,s=this;e=Number(e);var o=u.p(a),d=function(x){var D=p(s);return u.w(D.date(D.date()+Math.round(x*e)),s)};if(o===g)return this.set(g,this.$M+e);if(o===j)return this.set(j,this.$y+e);if(o===c)return d(1);if(o===_)return d(7);var m=(t={},t[U]=v,t[N]=w,t[f]=b,t)[o]||1,h=this.$d.getTime()+e*m;return u.w(h,this)},r.subtract=function(e,a){return this.add(-1*e,a)},r.format=function(e){var a=this,t=this.$locale();if(!this.isValid())return t.invalidDate||O;var s=e||"YYYY-MM-DDTHH:mm:ssZ",o=u.z(this),d=this.$H,m=this.$m,h=this.$M,x=t.weekdays,D=t.months,I=t.meridiem,L=function(A,z,G,te){return A&&(A[z]||A(a,s))||G[z].slice(0,te)},Q=function(A){return u.s(d%12||12,A,"0")},q=I||function(A,z,G){var te=A<12?"AM":"PM";return G?te.toLowerCase():te};return s.replace(J,(function(A,z){return z||(function(G){switch(G){case"YY":return String(a.$y).slice(-2);case"YYYY":return u.s(a.$y,4,"0");case"M":return h+1;case"MM":return u.s(h+1,2,"0");case"MMM":return L(t.monthsShort,h,D,3);case"MMMM":return L(D,h);case"D":return a.$D;case"DD":return u.s(a.$D,2,"0");case"d":return String(a.$W);case"dd":return L(t.weekdaysMin,a.$W,x,2);case"ddd":return L(t.weekdaysShort,a.$W,x,3);case"dddd":return x[a.$W];case"H":return String(d);case"HH":return u.s(d,2,"0");case"h":return Q(1);case"hh":return Q(2);case"a":return q(d,m,!0);case"A":return q(d,m,!1);case"m":return String(m);case"mm":return u.s(m,2,"0");case"s":return String(a.$s);case"ss":return u.s(a.$s,2,"0");case"SSS":return u.s(a.$ms,3,"0");case"Z":return o}return null})(A)||o.replace(":","")}))},r.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},r.diff=function(e,a,t){var s,o=this,d=u.p(a),m=p(e),h=(m.utcOffset()-this.utcOffset())*v,x=this-m,D=function(){return u.m(o,m)};switch(d){case j:s=D()/12;break;case g:s=D();break;case H:s=D()/3;break;case _:s=(x-h)/6048e5;break;case c:s=(x-h)/864e5;break;case N:s=x/w;break;case U:s=x/v;break;case f:s=x/b;break;default:s=x}return t?s:u.a(s)},r.daysInMonth=function(){return this.endOf(g).$D},r.$locale=function(){return $[this.$L]},r.locale=function(e,a){if(!e)return this.$L;var t=this.clone(),s=X(e,a,!0);return s&&(t.$L=s),t},r.clone=function(){return u.w(this.$d,this)},r.toDate=function(){return new Date(this.valueOf())},r.toJSON=function(){return this.isValid()?this.toISOString():null},r.toISOString=function(){return this.$d.toISOString()},r.toString=function(){return this.$d.toUTCString()},n})(),Ae=ee.prototype;return p.prototype=Ae,[["$ms",y],["$s",f],["$m",U],["$H",N],["$W",c],["$M",g],["$y",j],["$D",k]].forEach((function(n){Ae[n[1]]=function(r){return this.$g(r,n[0],n[1])}})),p.extend=function(n,r){return n.$i||(n(r,ee,p),n.$i=!0),p},p.locale=X,p.isDayjs=C,p.unix=function(n){return p(1e3*n)},p.en=$[S],p.Ls=$,p.p={},p}))})(xe)),xe.exports}var qe=ke();const R=je(qe);var ye={exports:{}},Re=ye.exports,we;function He(){return we||(we=1,(function(l,K){(function(b,v){l.exports=v()})(Re,(function(){return function(b,v,w){b=b||{};var y=v.prototype,f={future:"in %s",past:"%s ago",s:"a few seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"};function U(c,_,g,H){return y.fromToBase(c,_,g,H)}w.en.relativeTime=f,y.fromToBase=function(c,_,g,H,j){for(var k,O,V,J=g.$locale().relativeTime||f,Z=b.thresholds||[{l:"s",r:44,d:"second"},{l:"m",r:89},{l:"mm",r:44,d:"minute"},{l:"h",r:89},{l:"hh",r:21,d:"hour"},{l:"d",r:35},{l:"dd",r:25,d:"day"},{l:"M",r:45},{l:"MM",r:10,d:"month"},{l:"y",r:17},{l:"yy",d:"year"}],P=Z.length,Y=0;Y<P;Y+=1){var S=Z[Y];S.d&&(k=H?w(c).diff(g,S.d,!0):g.diff(c,S.d,!0));var $=(b.rounding||Math.round)(Math.abs(k));if(V=k>0,$<=S.r||!S.r){$<=1&&Y>0&&(S=Z[Y-1]);var F=J[S.l];j&&($=j(""+$)),O=typeof F=="string"?F.replace("%d",$):F($,_,S.l,V);break}}if(_)return O;var C=V?J.future:J.past;return typeof C=="function"?C(O):C.replace("%s",O)},y.to=function(c,_){return U(c,_,this,!0)},y.from=function(c,_){return U(c,_,this)};var N=function(c){return c.$u?w.utc():w()};y.toNow=function(c){return this.to(N(this),c)},y.fromNow=function(c){return this.from(N(this),c)}}}))})(ye)),ye.exports}var Fe=He();const Ie=je(Fe);var be={exports:{}},Be=be.exports,De;function Ee(){return De||(De=1,(function(l,K){(function(b,v){l.exports=v(ke())})(Be,(function(b){function v(f){return f&&typeof f=="object"&&"default"in f?f:{default:f}}var w=v(b),y={name:"pt-br",weekdays:"domingo_segunda-feira_terça-feira_quarta-feira_quinta-feira_sexta-feira_sábado".split("_"),weekdaysShort:"dom_seg_ter_qua_qui_sex_sáb".split("_"),weekdaysMin:"Do_2ª_3ª_4ª_5ª_6ª_Sá".split("_"),months:"janeiro_fevereiro_março_abril_maio_junho_julho_agosto_setembro_outubro_novembro_dezembro".split("_"),monthsShort:"jan_fev_mar_abr_mai_jun_jul_ago_set_out_nov_dez".split("_"),ordinal:function(f){return f+"º"},formats:{LT:"HH:mm",LTS:"HH:mm:ss",L:"DD/MM/YYYY",LL:"D [de] MMMM [de] YYYY",LLL:"D [de] MMMM [de] YYYY [às] HH:mm",LLLL:"dddd, D [de] MMMM [de] YYYY [às] HH:mm"},relativeTime:{future:"em %s",past:"há %s",s:"poucos segundos",m:"um minuto",mm:"%d minutos",h:"uma hora",hh:"%d horas",d:"um dia",dd:"%d dias",M:"um mês",MM:"%d meses",y:"um ano",yy:"%d anos"}};return w.default.locale(y,null,!0),y}))})(be)),be.exports}Ee();R.extend(Ie);R.locale("pt-br");const We={aberta:{indicatorClass:"bg-primary",label:"Livre"},alerta:{indicatorClass:"bg-red-700 dark:bg-red-600",label:"Alerta"},fechada:{indicatorClass:"bg-zinc-400 dark:bg-zinc-500",label:"Em uso"}};function M({room:l,authenticated:K}){const{indicatorClass:b}=We[l.state],v=l.state==="fechada"?l.currentUser:l.lastUser,w=l.lastStatusUpdateAt?R(l.lastStatusUpdateAt).isBefore(R().startOf("day"))?R(l.lastStatusUpdateAt).fromNow():R(l.lastStatusUpdateAt).format("HH:mm"):null,y=l.lastStatusUpdateAt?R(l.lastStatusUpdateAt).format("DD/MM/YYYY HH:mm"):null;return i.jsxs("div",{className:Me("flex w-42 shrink-0 items-stretch gap-2 rounded-lg bg-white dark:bg-zinc-800 py-3 px-2 shadow-none backdrop-blur-sm","transition-shadow hover:shadow-md","first:ml-4 first:sm:ml-8 first:md:ml-16 first:lg:ml-32 first:transition-all","last:mr-4 last:sm:mr-8 last:md:mr-16 last:lg:mr-32 last:transition-all"),children:[i.jsx("div",{className:Me("w-1 shrink-0 self-stretch rounded-full",b)}),i.jsxs("div",{className:"flex min-w-0 flex-1 flex-col gap-1.5",children:[i.jsxs("div",{className:"flex w-full items-center justify-between",children:[i.jsx("div",{className:"flex flex-wrap items-center gap-1.5",children:i.jsx("span",{className:"truncate text-sm font-semibold text-zinc-900 dark:text-zinc-200 leading-tight",children:l.name})}),i.jsx(Te,{variant:"outline",className:"w-fit text-[10px] uppercase px-1.5 py-0 bg-zinc-200 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300 font-bold",children:l.typeAbbreviation})]}),i.jsx("div",{className:"flex-1"}),K&&v&&i.jsxs("div",{className:"flex items-center gap-1 text-xs text-zinc-500 truncate",children:[i.jsx(Ce,{className:"size-3 shrink-0 text-zinc-400"}),i.jsx("span",{className:"truncate",children:v.name})]}),w?i.jsx("span",{className:"text-[11px] text-zinc-400 leading-tight",title:y??void 0,children:w}):i.jsx("span",{className:"text-[11px] text-zinc-300 leading-tight",children:"Sem registro"})]})]})}M.__docgenInfo={description:"",methods:[],displayName:"RoomCard",props:{room:{required:!0,tsType:{name:"signature",type:"object",raw:`{
	id: string;
	name: string;
	typeAbbreviation: string;
	state: RoomState;
	lastStatusUpdateAt: string | null;
	currentUser?: UserInfo | null;
	lastUser?: UserInfo | null;
}`,signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"name",value:{name:"string",required:!0}},{key:"typeAbbreviation",value:{name:"string",required:!0}},{key:"state",value:{name:"union",raw:'"aberta" | "fechada" | "alerta"',elements:[{name:"literal",value:'"aberta"'},{name:"literal",value:'"fechada"'},{name:"literal",value:'"alerta"'}],required:!0}},{key:"lastStatusUpdateAt",value:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}],required:!0}},{key:"currentUser",value:{name:"union",raw:"UserInfo | null",elements:[{name:"signature",type:"object",raw:"{ id: string; name: string; email: string }",signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"name",value:{name:"string",required:!0}},{key:"email",value:{name:"string",required:!0}}]}},{name:"null"}],required:!1}},{key:"lastUser",value:{name:"union",raw:"UserInfo | null",elements:[{name:"signature",type:"object",raw:"{ id: string; name: string; email: string }",signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"name",value:{name:"string",required:!0}},{key:"email",value:{name:"string",required:!0}}]}},{name:"null"}],required:!1}}]}},description:""},authenticated:{required:!0,tsType:{name:"boolean"},description:""}}};const W={id:"room-1",name:"Sala 101",typeAbbreviation:"LAB",state:"aberta",lastStatusUpdateAt:new Date(Date.now()-1e3*60*5).toISOString(),currentUser:null,lastUser:null},Se={id:"u1",name:"Alice Ferreira",email:"alice@ifsp.edu.br"},$e={id:"u2",name:"Bob Santos",email:"bob@ifsp.edu.br"},T={...W,state:"aberta",lastStatusUpdateAt:new Date(Date.now()-1e3*60*3).toISOString(),lastUser:Se},B={...W,id:"room-2",name:"Sala 202",typeAbbreviation:"SALA",state:"fechada",lastStatusUpdateAt:new Date(Date.now()-1e3*60*10).toISOString(),currentUser:$e,lastUser:Se},E={...W,id:"room-3",name:"Auditório A",typeAbbreviation:"AUD",state:"alerta",lastStatusUpdateAt:new Date(Date.now()-1e3*60*1).toISOString(),currentUser:$e,lastUser:$e},Ue={...W,id:"room-4",name:"Sala 305",typeAbbreviation:"SALA",state:"aberta",lastStatusUpdateAt:null,currentUser:null,lastUser:null},Ne={...W,id:"room-5",name:"Lab de Redes",typeAbbreviation:"LAB",state:"fechada",lastStatusUpdateAt:new Date(Date.now()-1e3*60*60*26).toISOString(),currentUser:Se,lastUser:Se},ze={...W,id:"room-6",name:"Laboratório de Desenvolvimento de Software",typeAbbreviation:"LDSW",state:"aberta",lastStatusUpdateAt:new Date(Date.now()-1e3*60*2).toISOString(),lastUser:$e},Xe={title:"Rooms/RoomCard",component:M,parameters:{layout:"centered"},tags:["autodocs"],argTypes:{authenticated:{control:"boolean"},room:{control:"object"}},args:{room:T,authenticated:!0},decorators:[l=>i.jsx("div",{className:"flex p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl",children:i.jsx(l,{})})]},re={args:{room:T,authenticated:!0},parameters:{docs:{description:{story:"Sala livre — indicador verde, mostra o último usuário."}}}},ae={args:{room:B,authenticated:!0},parameters:{docs:{description:{story:"Sala em uso — indicador cinza, mostra o usuário atual."}}}},ne={args:{room:E,authenticated:!0},parameters:{docs:{description:{story:"Sala em alerta — indicador vermelho escuro, mostra o usuário atual."}}}},se={args:{room:T,authenticated:!0},parameters:{docs:{description:{story:"Usuário autenticado vê o nome do último usuário que usou a sala."}}}},oe={args:{room:T,authenticated:!1},parameters:{docs:{description:{story:"Usuário não autenticado — informações de usuário ficam ocultas."}}}},ie={args:{room:B,authenticated:!0}},ue={args:{room:B,authenticated:!1}},de={args:{room:E,authenticated:!0}},ce={args:{room:E,authenticated:!1}},me={args:{room:Ue,authenticated:!0},parameters:{docs:{description:{story:'Sala sem nenhuma atualização registrada — exibe "Sem registro".'}}}},le={args:{room:Ne,authenticated:!0},parameters:{docs:{description:{story:"Quando o último uso foi antes de hoje, exibe tempo relativo (ex: 'há 1 dia') em vez do horário."}}}},pe={args:{room:ze,authenticated:!0},parameters:{docs:{description:{story:"Nome de sala muito longo — deve truncar com ellipsis dentro da largura fixa do card."}}}},he={args:{room:{...T,lastUser:null,currentUser:null},authenticated:!0},parameters:{docs:{description:{story:"Sala aberta sem nenhum usuário vinculado — sem linha de usuário."}}}},fe={render:()=>i.jsxs("div",{className:"flex gap-3 flex-wrap p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl",children:[i.jsx(M,{room:T,authenticated:!0}),i.jsx(M,{room:B,authenticated:!0}),i.jsx(M,{room:E,authenticated:!0})]}),decorators:[],parameters:{layout:"padded",docs:{description:{story:"Os três estados possíveis de uma sala: livre, em uso e em alerta."}}}},ge={render:()=>i.jsxs("div",{className:"flex flex-col gap-6 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl",children:[i.jsxs("div",{children:[i.jsx("p",{className:"text-xs text-zinc-500 uppercase tracking-wider mb-2 pl-1",children:"Autenticado"}),i.jsxs("div",{className:"flex gap-3",children:[i.jsx(M,{room:T,authenticated:!0}),i.jsx(M,{room:B,authenticated:!0}),i.jsx(M,{room:E,authenticated:!0})]})]}),i.jsxs("div",{children:[i.jsx("p",{className:"text-xs text-zinc-500 uppercase tracking-wider mb-2 pl-1",children:"Anônimo"}),i.jsxs("div",{className:"flex gap-3",children:[i.jsx(M,{room:T,authenticated:!1}),i.jsx(M,{room:B,authenticated:!1}),i.jsx(M,{room:E,authenticated:!1})]})]})]}),decorators:[],parameters:{layout:"padded",docs:{description:{story:"Comparação direta entre visualização autenticada e anônima para os três estados."}}}},ve={render:()=>i.jsxs("div",{className:"flex gap-3 flex-wrap p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl",children:[i.jsx(M,{room:Ue,authenticated:!0}),i.jsx(M,{room:Ne,authenticated:!0}),i.jsx(M,{room:ze,authenticated:!0})]}),decorators:[],parameters:{layout:"padded",docs:{description:{story:"Casos de borda: sem timestamp, timestamp de ontem e nome longo."}}}};re.parameters={...re.parameters,docs:{...re.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomAberta,
    authenticated: true
  },
  parameters: {
    docs: {
      description: {
        story: "Sala livre — indicador verde, mostra o último usuário."
      }
    }
  }
}`,...re.parameters?.docs?.source}}};ae.parameters={...ae.parameters,docs:{...ae.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomFechada,
    authenticated: true
  },
  parameters: {
    docs: {
      description: {
        story: "Sala em uso — indicador cinza, mostra o usuário atual."
      }
    }
  }
}`,...ae.parameters?.docs?.source}}};ne.parameters={...ne.parameters,docs:{...ne.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomAlerta,
    authenticated: true
  },
  parameters: {
    docs: {
      description: {
        story: "Sala em alerta — indicador vermelho escuro, mostra o usuário atual."
      }
    }
  }
}`,...ne.parameters?.docs?.source}}};se.parameters={...se.parameters,docs:{...se.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomAberta,
    authenticated: true
  },
  parameters: {
    docs: {
      description: {
        story: "Usuário autenticado vê o nome do último usuário que usou a sala."
      }
    }
  }
}`,...se.parameters?.docs?.source}}};oe.parameters={...oe.parameters,docs:{...oe.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomAberta,
    authenticated: false
  },
  parameters: {
    docs: {
      description: {
        story: "Usuário não autenticado — informações de usuário ficam ocultas."
      }
    }
  }
}`,...oe.parameters?.docs?.source}}};ie.parameters={...ie.parameters,docs:{...ie.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomFechada,
    authenticated: true
  }
}`,...ie.parameters?.docs?.source}}};ue.parameters={...ue.parameters,docs:{...ue.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomFechada,
    authenticated: false
  }
}`,...ue.parameters?.docs?.source}}};de.parameters={...de.parameters,docs:{...de.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomAlerta,
    authenticated: true
  }
}`,...de.parameters?.docs?.source}}};ce.parameters={...ce.parameters,docs:{...ce.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomAlerta,
    authenticated: false
  }
}`,...ce.parameters?.docs?.source}}};me.parameters={...me.parameters,docs:{...me.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomNoTimestamp,
    authenticated: true
  },
  parameters: {
    docs: {
      description: {
        story: 'Sala sem nenhuma atualização registrada — exibe "Sem registro".'
      }
    }
  }
}`,...me.parameters?.docs?.source}}};le.parameters={...le.parameters,docs:{...le.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomYesterday,
    authenticated: true
  },
  parameters: {
    docs: {
      description: {
        story: "Quando o último uso foi antes de hoje, exibe tempo relativo (ex: 'há 1 dia') em vez do horário."
      }
    }
  }
}`,...le.parameters?.docs?.source}}};pe.parameters={...pe.parameters,docs:{...pe.parameters?.docs,source:{originalSource:`{
  args: {
    room: roomLongName,
    authenticated: true
  },
  parameters: {
    docs: {
      description: {
        story: "Nome de sala muito longo — deve truncar com ellipsis dentro da largura fixa do card."
      }
    }
  }
}`,...pe.parameters?.docs?.source}}};he.parameters={...he.parameters,docs:{...he.parameters?.docs,source:{originalSource:`{
  args: {
    room: {
      ...roomAberta,
      lastUser: null,
      currentUser: null
    },
    authenticated: true
  },
  parameters: {
    docs: {
      description: {
        story: "Sala aberta sem nenhum usuário vinculado — sem linha de usuário."
      }
    }
  }
}`,...he.parameters?.docs?.source}}};fe.parameters={...fe.parameters,docs:{...fe.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-3 flex-wrap p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
            <RoomCard room={roomAberta} authenticated />
            <RoomCard room={roomFechada} authenticated />
            <RoomCard room={roomAlerta} authenticated />
        </div>,
  decorators: [],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Os três estados possíveis de uma sala: livre, em uso e em alerta."
      }
    }
  }
}`,...fe.parameters?.docs?.source}}};ge.parameters={...ge.parameters,docs:{...ge.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex flex-col gap-6 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
            <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 pl-1">
                    Autenticado
                </p>
                <div className="flex gap-3">
                    <RoomCard room={roomAberta} authenticated />
                    <RoomCard room={roomFechada} authenticated />
                    <RoomCard room={roomAlerta} authenticated />
                </div>
            </div>
            <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2 pl-1">
                    Anônimo
                </p>
                <div className="flex gap-3">
                    <RoomCard room={roomAberta} authenticated={false} />
                    <RoomCard room={roomFechada} authenticated={false} />
                    <RoomCard room={roomAlerta} authenticated={false} />
                </div>
            </div>
        </div>,
  decorators: [],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Comparação direta entre visualização autenticada e anônima para os três estados."
      }
    }
  }
}`,...ge.parameters?.docs?.source}}};ve.parameters={...ve.parameters,docs:{...ve.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex gap-3 flex-wrap p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
            <RoomCard room={roomNoTimestamp} authenticated />
            <RoomCard room={roomYesterday} authenticated />
            <RoomCard room={roomLongName} authenticated />
        </div>,
  decorators: [],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        story: "Casos de borda: sem timestamp, timestamp de ontem e nome longo."
      }
    }
  }
}`,...ve.parameters?.docs?.source}}};const et=["Aberta","Fechada","Alerta","AbertaAutenticado","AbertaAnonimo","FechadaAutenticado","FechadaAnonimo","AlertaAutenticado","AlertaAnonimo","SemTimestamp","TimestampOntem","NomeLongo","SemUsuario","TodosOsEstados","AutenticadoVsAnonimo","EdgeCases"];export{re as Aberta,oe as AbertaAnonimo,se as AbertaAutenticado,ne as Alerta,ce as AlertaAnonimo,de as AlertaAutenticado,ge as AutenticadoVsAnonimo,ve as EdgeCases,ae as Fechada,ue as FechadaAnonimo,ie as FechadaAutenticado,pe as NomeLongo,me as SemTimestamp,he as SemUsuario,le as TimestampOntem,fe as TodosOsEstados,et as __namedExportsOrder,Xe as default};
