import{r as S,j as e}from"./vendor-query-ktmI6Rse.js";import{z as M,_ as K,L as Y,ai as G,am as U,v as q,ap as F,C as V,a as Q,q as X,a8 as Z}from"./chunk-invoices-Bxcc5wGQ.js";import{a as ee}from"./vendor-react-DmIZKEO1.js";const t={bg:"#060f1e",card:"#0d1b2a",border:"rgba(201,168,76,0.18)",borderSub:"rgba(255,255,255,0.07)",gold:"#C9A84C",goldBtn:"linear-gradient(135deg,#C9A84C,#8B6914)",goldDim:"rgba(201,168,76,0.10)",green:"#27ae60",greenBg:"rgba(39,174,96,0.12)",red:"#e74c3c",redBg:"rgba(231,76,60,0.10)",orange:"#f39c12",orangeBg:"rgba(243,156,18,0.10)",blue:"#3B82F6",blueBg:"rgba(59,130,246,0.10)",text:"#e8eaf0",muted:"#6b7a99"},te=`
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes shimmer { from { opacity:0.6 } to { opacity:1 } }

  /* ── Scrollbar piti */
  .sol-scroll::-webkit-scrollbar { width: 3px; height: 3px; }
  .sol-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px; }

  /* ── Placeholders */
  .sol-inp::placeholder { color: #2a3a54; }
  .sol-inp:focus { border-color: rgba(201,168,76,0.5) !important; outline: none; }

  /* ── Touch tap highlight retire */
  button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }

  /* ── Stats grid: 2 kolòn sou >=360px, 1 kolòn anba */
  .sol-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }
  @media (max-width: 340px) {
    .sol-stats-grid { grid-template-columns: 1fr; }
  }

  /* ── Payment history row */
  .sol-pay-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    gap: 8px;
    min-width: 0;
  }
  .sol-pay-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }
  .sol-pay-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  /* ── Tabs: plein largeur mobile */
  .sol-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  }
  .sol-tab-btn {
    flex: 1;
    padding: 10px 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    transition: all 0.15s;
    white-space: nowrap;
  }

  /* ── Header */
  .sol-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    gap: 8px;
  }
  .sol-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }
  .sol-header-title {
    font-size: 12px;
    font-weight: 800;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sol-header-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  /* ── Kont card header */
  .sol-kont-card {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 10px;
  }
  .sol-kont-amount {
    font-family: monospace;
    font-weight: 900;
    font-size: 22px;
    margin: 0;
  }
  @media (max-width: 380px) {
    .sol-kont-amount { font-size: 18px; }
    .sol-pay-row { padding: 9px 12px; }
    .sol-tab-btn { font-size: 11px; padding: 9px 6px; }
  }
  @media (max-width: 320px) {
    .sol-kont-amount { font-size: 15px; }
    .sol-header { padding: 10px 11px; }
  }

  /* ── Calendar responsive */
  .sol-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }
  @media (max-width: 360px) {
    .sol-cal-grid { gap: 1px; }
  }
  .sol-cal-day {
    aspect-ratio: 1;
    border-radius: 7px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .sol-cal-day span {
    font-size: 10px;
  }
  @media (max-width: 360px) {
    .sol-cal-day span { font-size: 9px; }
  }
  @media (max-width: 300px) {
    .sol-cal-day span { font-size: 8px; }
  }

  /* ── Modal responsive */
  .sol-modal-sheet {
    background: #0d1b2a;
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 440px;
    padding: 24px 18px 40px;
    max-height: 90vh;
    overflow-y: auto;
  }
  @media (min-width: 600px) {
    .sol-modal-sheet {
      border-radius: 16px;
      margin: 20px;
      max-height: 85vh;
    }
  }

  /* ── Pèfòmans badges wrap */
  .sol-score-row {
    display: flex;
    gap: 10px;
    font-size: 11px;
    flex-wrap: wrap;
  }
  @media (max-width: 320px) {
    .sol-score-row { gap: 7px; font-size: 10px; }
  }

  /* ── Alert banner */
  .sol-alert {
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  @media (max-width: 360px) {
    .sol-alert { padding: 10px 12px; gap: 8px; }
  }
`,E="https://plusgroup-backend.onrender.com",T=o=>Number(o||0).toLocaleString("fr-HT",{minimumFractionDigits:0});function ne(o,g,c){const f=[],m=s=>{if(!s)return new Date;const i=String(s).split("T")[0].split("-").map(Number);return new Date(i[0],i[1]-1,i[2])},u=s=>{const i=s.getFullYear(),v=String(s.getMonth()+1).padStart(2,"0"),$=String(s.getDate()).padStart(2,"0");return`${i}-${v}-${$}`},a=m(g),x=()=>{switch(o){case"daily":a.setDate(a.getDate()+1);break;case"weekly_saturday":case"saturday":a.setDate(a.getDate()+((6-a.getDay()+7)%7||7));break;case"weekly_monday":case"weekly":a.setDate(a.getDate()+((1-a.getDay()+7)%7||7));break;case"biweekly":a.setDate(a.getDate()+14);break;case"monthly":a.setMonth(a.getMonth()+1);break;case"weekdays":do a.setDate(a.getDate()+1);while([0,6].includes(a.getDay()));break;default:a.setDate(a.getDate()+1)}};f.push(u(a));for(let s=1;s<c;s++)x(),f.push(u(new Date(a)));return f}const ae={daily:"Chak Jou",weekly_saturday:"Chak Samdi",weekly_monday:"Chak Lendi",biweekly:"Chak 15 Jou",monthly:"Chak Mwa",weekdays:"Lendi-Vandredi",saturday:"Chak Samdi",weekly:"Chak Lendi"};function re({paid:o}){return e.jsxs("span",{style:{padding:"2px 7px",borderRadius:20,fontWeight:700,fontSize:10,display:"inline-flex",alignItems:"center",gap:3,flexShrink:0,background:o?t.greenBg:t.redBg,color:o?t.green:t.red,whiteSpace:"nowrap"},children:[o?e.jsx(V,{size:9}):e.jsx(Q,{size:9}),o?"Peye":"Pa Peye"]})}function oe({score:o}){const g=o>=80?"#00d084":o>=50?t.orange:t.red,c=o>=80?"⭐ Ekselans":o>=50?"⚠️ Mwayen":"❌ Reta";return e.jsxs("span",{style:{padding:"3px 9px",borderRadius:20,fontWeight:700,fontSize:11,background:`${g}18`,color:g,whiteSpace:"nowrap"},children:[c," — ",o,"%"]})}function se({onClose:o,token:g}){const[c,f]=S.useState({current:"",next:"",confirm:""}),[m,u]=S.useState(!1),a=async()=>{if(!c.current||!c.next)return M.error("Ranpli tout chan yo.");if(c.next.length<4)return M.error("Modpas nouvo dwe gen omwen 4 karaktè.");if(c.next!==c.confirm)return M.error("Modpas yo pa menm.");u(!0);try{const s=await fetch(`${E}/api/sol/auth/change-password`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${g}`},body:JSON.stringify({currentPassword:c.current,newPassword:c.next})}),i=await s.json();if(!s.ok)throw new Error(i.message||"Erè");M.success("Modpas chanje!"),o()}catch(s){M.error(s.message)}finally{u(!1)}},x={width:"100%",padding:"12px 13px",borderRadius:10,fontSize:15,border:"1.5px solid rgba(255,255,255,0.09)",color:t.text,background:t.bg,fontFamily:"inherit",transition:"border-color 0.15s"};return e.jsx("div",{style:{position:"fixed",inset:0,zIndex:1e3,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center"},onClick:s=>s.target===s.currentTarget&&o(),children:e.jsxs("div",{className:"sol-modal-sheet",children:[e.jsx("div",{style:{display:"flex",justifyContent:"center",marginBottom:16},children:e.jsx("div",{style:{width:36,height:4,borderRadius:2,background:"rgba(255,255,255,0.12)"}})}),e.jsxs("h2",{style:{fontSize:16,fontWeight:800,color:"#fff",margin:"0 0 20px",display:"flex",alignItems:"center",gap:8},children:[e.jsx(F,{size:16,style:{color:t.gold}})," Chanje Modpas"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:14},children:[[{label:"Modpas Aktyèl",key:"current"},{label:"Nouvo Modpas",key:"next"},{label:"Konfime Nouvo Modpas",key:"confirm"}].map(({label:s,key:i})=>e.jsxs("div",{children:[e.jsx("label",{style:{display:"block",fontSize:10,fontWeight:700,color:"rgba(201,168,76,0.75)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"},children:s}),e.jsx("input",{type:"password",className:"sol-inp",style:x,value:c[i],onChange:v=>f($=>({...$,[i]:v.target.value})),placeholder:"••••••",autoComplete:i==="current"?"current-password":"new-password"})]},i)),e.jsxs("div",{style:{display:"flex",gap:10,marginTop:4},children:[e.jsx("button",{onClick:o,style:{flex:1,padding:"13px",borderRadius:10,cursor:"pointer",border:`1px solid ${t.borderSub}`,background:"transparent",color:t.muted,fontWeight:700,fontSize:14,minHeight:48},children:"Anile"}),e.jsxs("button",{onClick:a,disabled:m,style:{flex:2,padding:"13px",borderRadius:10,border:"none",background:m?"rgba(201,168,76,0.3)":t.goldBtn,color:"#0a1222",fontWeight:800,fontSize:14,cursor:m?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,minHeight:48},children:[m?e.jsx("span",{style:{width:16,height:16,border:"2px solid rgba(0,0,0,0.2)",borderTopColor:"#0a1222",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block"}}):e.jsx(F,{size:15}),m?"Ap chanje...":"Chanje Modpas"]})]})]})]})})}function ie({dates:o,member:g,plan:c,today:f}){const[m,u]=S.useState(0),a=new Date;a.setMonth(a.getMonth()+m);const x=a.getFullYear(),s=a.getMonth(),i=a.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),v=new Date(x,s,1).getDay(),$=new Date(x,s+1,0).getDate(),h=new Set(o);return e.jsxs("div",{style:{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"14px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:[e.jsx("button",{onClick:()=>u(r=>r-1),style:{width:36,height:36,borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",color:t.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(X,{size:16})}),e.jsx("span",{style:{fontWeight:800,fontSize:13,color:"#fff",textTransform:"capitalize"},children:i}),e.jsx("button",{onClick:()=>u(r=>r+1),style:{width:36,height:36,borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",color:t.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(Z,{size:16})})]}),e.jsx("div",{className:"sol-cal-grid",style:{marginBottom:4},children:["Di","Lu","Ma","Me","Je","Ve","Sa"].map(r=>e.jsx("div",{style:{textAlign:"center",fontSize:9,fontWeight:800,color:t.muted,padding:"3px 0"},children:r},r))}),e.jsxs("div",{className:"sol-cal-grid",children:[Array.from({length:v}).map((r,d)=>e.jsx("div",{style:{aspectRatio:"1"}},`e${d}`)),Array.from({length:$}).map((r,d)=>{var D,B;const R=d+1,p=`${x}-${String(s+1).padStart(2,"0")}-${String(R).padStart(2,"0")}`,y=p===f,z=h.has(p),C=!!((D=g.payments)!=null&&D[p]),N=(B=g.paymentTimings)==null?void 0:B[p],P=p<f,I=p===o[g.position-1];let b="transparent",j="transparent",w=P?"rgba(255,255,255,0.15)":t.muted;return y?(b=t.goldDim,j=t.gold,w=t.gold):I?(b="rgba(39,174,96,0.15)",j=`${t.green}40`,w=t.green):z&&C&&N==="early"?(b="rgba(0,208,132,0.15)",j="rgba(0,208,132,0.4)",w="#00d084"):z&&C?(b=t.greenBg,j=`${t.green}40`,w=t.green):z&&P?(b=t.redBg,j=`${t.red}30`,w=t.red):z&&(b=t.blueBg,j="rgba(59,130,246,0.3)",w=t.blue),e.jsxs("div",{className:"sol-cal-day",style:{background:b,border:`1px solid ${j}`},children:[e.jsx("span",{style:{fontWeight:z||y?800:400,color:w},children:R}),I&&e.jsx("span",{style:{fontSize:7,lineHeight:1},children:"🏆"})]},R)})]}),e.jsxs("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginTop:12,fontSize:9,color:t.muted},children:[[["#00d084","Bonè"],[t.green,"Peye"],[t.red,"Pa Peye"],[t.blue,"Pwochen"]].map(([r,d])=>e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:3},children:[e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:r,display:"inline-block"}}),d]},d)),e.jsx("span",{children:"🏆 Dat Touche"})]})]})}function pe(){const o=ee(),[g,c]=S.useState(null),[f,m]=S.useState(!0),[u,a]=S.useState(!1),[x,s]=S.useState("history");S.useEffect(()=>{const n=document.createElement("style");return n.id="sol-dashboard-styles",n.textContent=te,document.head.appendChild(n),()=>{var l;return(l=document.getElementById("sol-dashboard-styles"))==null?void 0:l.remove()}},[]);const i=localStorage.getItem("sol_token"),v=S.useCallback(async()=>{if(!i){o("/app/sol/login");return}m(!0);try{const n=await fetch(`${E}/api/sol/members/me`,{headers:{Authorization:`Bearer ${i}`}});if(n.status===401){localStorage.removeItem("sol_token"),localStorage.removeItem("sol_member"),o("/app/sol/login");return}const l=await n.json();c(l)}catch{M.error("Pa ka chaje done yo. Verifye koneksyon ou.")}finally{m(!1)}},[i,o]);S.useEffect(()=>{v()},[v]);const $=()=>{localStorage.removeItem("sol_token"),localStorage.removeItem("sol_member"),o("/app/sol/login"),M("Ou dekonekte",{icon:"👋"})};if(f)return e.jsxs("div",{style:{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"DM Sans, sans-serif"},children:[e.jsx("style",{children:"@keyframes spin{to{transform:rotate(360deg)}}"}),e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:40,height:40,border:`3px solid ${t.goldDim}`,borderTopColor:t.gold,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 12px"}}),e.jsx("p",{style:{color:t.muted,fontSize:13,margin:0},children:"Ap chaje kont ou..."})]})]});if(!g)return null;const{member:h,plan:r,tenant:d}=g,R=new Date,p=`${R.getFullYear()}-${String(R.getMonth()+1).padStart(2,"0")}-${String(R.getDate()).padStart(2,"0")}`,y=ne(r.frequency,r.createdAt,r.maxMembers),z=y[h.position-1],C=y.filter(n=>{var l;return(l=h.payments)==null?void 0:l[n]}).length,N=y.filter(n=>n<=p).length,P=C*r.amount,I=N*r.amount,b=r.amount*r.maxMembers-(r.fee||0),j=r.maxMembers>0?C/r.maxMembers*100:0,w=z===p,D=Object.values(h.paymentTimings||{}),B=D.length?(()=>{const n=D.filter(k=>k==="early").length,l=D.filter(k=>k==="onTime").length,W=D.filter(k=>k==="late").length;return{score:Math.round((n*2+l)/(D.length*2)*100),early:n,onTime:l,late:W}})():null,J=n=>n==="early"?e.jsx("span",{style:{fontSize:9,background:"rgba(0,208,132,0.15)",color:"#00d084",padding:"2px 6px",borderRadius:8,fontWeight:700,flexShrink:0},children:"⚡ Bonè"}):n==="onTime"?e.jsx("span",{style:{fontSize:9,background:t.greenBg,color:t.green,padding:"2px 6px",borderRadius:8,fontWeight:700,flexShrink:0},children:"✅ Atètan"}):n==="late"?e.jsx("span",{style:{fontSize:9,background:t.orangeBg,color:t.orange,padding:"2px 6px",borderRadius:8,fontWeight:700,flexShrink:0},children:"⚠️ Reta"}):null,A=y.find(n=>{var l;return n>=p&&!((l=h.payments)!=null&&l[n])});return e.jsxs("div",{style:{minHeight:"100vh",background:t.bg,fontFamily:"DM Sans, sans-serif",paddingBottom:60},children:[e.jsx("div",{style:{background:t.card,borderBottom:`1px solid ${t.border}`,position:"sticky",top:0,zIndex:10},children:e.jsxs("div",{className:"sol-header",children:[e.jsxs("div",{className:"sol-header-left",children:[d!=null&&d.logoUrl?e.jsx("img",{src:d.logoUrl,style:{height:30,borderRadius:7,objectFit:"contain",flexShrink:0},alt:"logo"}):e.jsx("div",{style:{width:30,height:30,borderRadius:7,background:t.goldBtn,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},children:e.jsx("span",{style:{fontSize:14},children:"🏦"})}),e.jsxs("div",{style:{minWidth:0},children:[e.jsx("div",{className:"sol-header-title",children:(d==null?void 0:d.businessName)||(d==null?void 0:d.name)||"Sol Ou"}),e.jsx("div",{style:{fontSize:10,color:t.muted},children:"Kont Sabotay"})]})]}),e.jsxs("div",{className:"sol-header-actions",children:[e.jsx("button",{onClick:v,title:"Aktualize",style:{width:36,height:36,minWidth:36,borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",color:t.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(K,{size:14})}),e.jsx("button",{onClick:$,title:"Dekonekte",style:{width:36,height:36,minWidth:36,borderRadius:8,border:`1px solid ${t.border}`,background:"transparent",color:t.red,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(Y,{size:14})})]})]})}),e.jsxs("div",{style:{maxWidth:500,margin:"0 auto",padding:"14px 12px",animation:"fadeUp 0.3s ease"},children:[w&&e.jsxs("div",{className:"sol-alert",style:{background:"linear-gradient(135deg,rgba(39,174,96,0.2),rgba(201,168,76,0.12))",border:`1px solid ${t.green}50`},children:[e.jsx("div",{style:{width:44,height:44,minWidth:44,borderRadius:12,background:t.goldBtn,display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(G,{size:20,color:"#0a1222"})}),e.jsxs("div",{style:{minWidth:0},children:[e.jsx("p",{style:{fontSize:14,fontWeight:900,color:t.green,margin:"0 0 2px"},children:"🎉 Se Jou Ou Jodi a!"}),e.jsxs("p",{style:{fontSize:12,color:t.muted,margin:0},children:["Ou ap touche: ",e.jsxs("span",{style:{color:t.gold,fontWeight:800},children:[T(b)," HTG"]})]})]})]}),A&&!w&&(()=>{const n=Math.ceil((new Date(A)-new Date(p))/864e5);return n>3?null:e.jsxs("div",{className:"sol-alert",style:{background:t.orangeBg,border:`1px solid ${t.orange}40`},children:[e.jsx(U,{size:18,style:{color:t.orange,flexShrink:0}}),e.jsx("p",{style:{fontSize:12,color:t.orange,fontWeight:700,margin:0,flex:1,minWidth:0},children:n===0?"Peman ou a se jodi a!":`Peman pwochèn ou a nan ${n} jou — ${A.split("-").reverse().join("/")}`})]})})(),e.jsx("div",{style:{background:t.goldBtn,borderRadius:18,padding:"18px 16px",marginBottom:14,color:"#0a1222"},children:e.jsxs("div",{className:"sol-kont-card",children:[e.jsxs("div",{style:{minWidth:0,flex:1},children:[e.jsx("p",{style:{fontSize:18,fontWeight:900,margin:"0 0 2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:h.name}),e.jsx("p",{style:{fontSize:11,opacity:.65,margin:"0 0 1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:h.phone}),e.jsxs("p",{style:{fontSize:11,opacity:.6,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:["Pozisyon #",h.position," • ",r.name]})]}),e.jsxs("div",{style:{textAlign:"right",flexShrink:0},children:[e.jsx("p",{style:{fontSize:9,opacity:.6,margin:"0 0 2px",textTransform:"uppercase",fontWeight:700},children:"Kontribisyon"}),e.jsxs("p",{className:"sol-kont-amount",children:[T(P)," HTG"]}),e.jsxs("p",{style:{fontSize:10,opacity:.55,margin:"2px 0 0"},children:[C,"/",r.maxMembers," peman"]})]})]})}),e.jsx("div",{className:"sol-stats-grid",children:[{label:"Rès pou Peye",val:`${T(Math.max(0,I-P))} HTG`,color:t.red},{label:"Ap Touche",val:`${T(b)} HTG`,color:t.gold},{label:"Dat Touche",val:z?z.split("-").reverse().join("/"):"—",color:t.blue},{label:"Frekans",val:ae[r.frequency]||r.frequency,color:t.muted}].map(({label:n,val:l,color:W})=>e.jsxs("div",{style:{background:t.card,border:`1px solid ${t.border}`,borderRadius:12,padding:"11px 12px"},children:[e.jsx("div",{style:{fontSize:9,color:t.muted,textTransform:"uppercase",fontWeight:700,marginBottom:4},children:n}),e.jsx("div",{style:{fontFamily:"monospace",fontWeight:800,fontSize:13,color:W,wordBreak:"break-word",lineHeight:1.3},children:l})]},n))}),e.jsxs("div",{style:{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,padding:"14px 15px",marginBottom:14},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},children:[e.jsx("span",{style:{fontSize:11,fontWeight:700,color:t.muted,textTransform:"uppercase"},children:"Pwogrè Sol"}),e.jsxs("span",{style:{fontSize:13,fontWeight:900,color:t.gold},children:[Math.round(j),"%"]})]}),e.jsx("div",{style:{height:10,borderRadius:8,background:"rgba(255,255,255,0.06)",overflow:"hidden"},children:e.jsx("div",{style:{height:"100%",width:`${j}%`,background:t.goldBtn,borderRadius:8,transition:"width 0.8s ease"}})}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:t.muted},children:[e.jsxs("span",{children:[C," peman fèt"]}),e.jsxs("span",{children:[r.maxMembers-C," rès"]})]})]}),B&&e.jsxs("div",{style:{background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)",borderRadius:14,padding:"13px 15px",marginBottom:14},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6},children:[e.jsxs("span",{style:{fontSize:11,fontWeight:800,color:t.blue,textTransform:"uppercase",display:"flex",alignItems:"center",gap:4},children:[e.jsx(q,{size:11})," Pèfòmans Ou"]}),e.jsx(oe,{score:B.score})]}),e.jsxs("div",{className:"sol-score-row",children:[e.jsxs("span",{style:{color:"#00d084",fontWeight:700},children:["⚡ ",B.early," bonè"]}),e.jsxs("span",{style:{color:t.green,fontWeight:700},children:["✅ ",B.onTime," atètan"]}),e.jsxs("span",{style:{color:t.orange,fontWeight:700},children:["⚠️ ",B.late," reta"]})]})]}),e.jsx("div",{className:"sol-tabs",children:[["history","📋 Istwa"],["calendar","📅 Kalandriye"]].map(([n,l])=>e.jsx("button",{className:"sol-tab-btn",onClick:()=>s(n),style:{border:`1px solid ${x===n?t.gold:t.borderSub}`,background:x===n?t.goldDim:"transparent",color:x===n?t.gold:t.muted,fontFamily:"inherit"},children:l},n))}),x==="history"&&e.jsxs("div",{style:{background:t.card,border:`1px solid ${t.border}`,borderRadius:14,overflow:"hidden"},children:[e.jsx("div",{style:{padding:"11px 14px",borderBottom:`1px solid ${t.border}`},children:e.jsxs("p",{style:{fontSize:11,fontWeight:800,color:t.muted,textTransform:"uppercase",letterSpacing:"0.06em",margin:0},children:["Istwa Peman (",C,"/",y.length,")"]})}),e.jsx("div",{className:"sol-scroll",style:{maxHeight:380,overflowY:"auto"},children:y.map((n,l)=>{var O,_;const W=!!((O=h.payments)!=null&&O[n]),H=(_=h.paymentTimings)==null?void 0:_[n],k=n<=p,L=l===h.position-1;return e.jsxs("div",{className:"sol-pay-row",style:{background:L?t.goldDim:n===p?"rgba(201,168,76,0.04)":"transparent"},children:[e.jsxs("div",{className:"sol-pay-left",children:[e.jsx("span",{style:{fontSize:12,fontFamily:"monospace",color:k?t.text:t.muted,flexShrink:0},children:n.split("-").reverse().join("/")}),L&&e.jsx("span",{style:{fontSize:9,background:t.goldDim,color:t.gold,padding:"2px 6px",borderRadius:8,fontWeight:700,flexShrink:0},children:"🏆"}),n===p&&!L&&e.jsx("span",{style:{fontSize:9,background:"rgba(59,130,246,0.15)",color:t.blue,padding:"2px 6px",borderRadius:8,fontWeight:700,flexShrink:0},children:"Jodi"}),W&&J(H)]}),e.jsxs("div",{className:"sol-pay-right",children:[e.jsxs("span",{style:{fontFamily:"monospace",fontSize:11,fontWeight:700,color:W?t.green:k?t.red:t.muted,whiteSpace:"nowrap"},children:[W?`+${T(r.amount)}`:k?`-${T(r.amount)}`:T(r.amount)," HTG"]}),k&&e.jsx(re,{paid:W})]})]},n)})})]}),x==="calendar"&&e.jsx(ie,{dates:y,member:h,plan:r,today:p}),e.jsxs("button",{onClick:()=>a(!0),style:{marginTop:16,width:"100%",padding:"14px",borderRadius:12,border:"1px solid rgba(155,89,182,0.25)",background:"rgba(155,89,182,0.06)",color:"#9b59b6",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7,minHeight:48,fontFamily:"inherit"},children:[e.jsx(F,{size:14})," Chanje Modpas"]})]}),u&&e.jsx(se,{token:i,onClose:()=>a(!1)})]})}export{pe as default};
