// src/pages/enterprise/MikwoKrediGuide.jsx
import { useState } from 'react'
import { D, SHARED_STYLES } from './kaneShared.jsx'
import { useEffect } from 'react'
import {
  BookOpen, CreditCard, DollarSign, PiggyBank,
  Lock, Users, ChevronRight, CheckCircle,
  AlertCircle, Clock, XCircle, Info,
  ArrowDownCircle, ArrowUpCircle, TrendingUp,
} from 'lucide-react'

// ─── Design ──────────────────────────────────────────────────
// ✅ Koulè tèks: min kontrast 4.5:1 sou fon #0d1b2a
// #a8b8cc = tèks kò prensipal  (kontrast ~6.2:1)
// #8fa3ba = tèks secondè/header (kontrast ~4.8:1)
const GUIDE_STYLES = `
  .gd-tabs        { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
  .gd-tab         { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; border:1px solid rgba(201,168,76,0.22); background:rgba(255,255,255,0.03); color:#a8b8cc; cursor:pointer; font-size:12px; font-weight:700; transition:all 0.15s; }
  .gd-tab.active  { background:rgba(201,168,76,0.15); border-color:rgba(201,168,76,0.55); color:#C9A84C; }
  .gd-tab:hover:not(.active) { background:rgba(255,255,255,0.06); color:#e8eaf0; }
  .gd-card        { background:#0d1b2a; border:1px solid rgba(201,168,76,0.18); border-radius:12px; padding:14px 16px; margin-bottom:12px; }
  .gd-steps       { list-style:none; padding:0; margin:0; counter-reset:gd-step; }
  .gd-steps li    { counter-increment:gd-step; display:flex; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.07); }
  .gd-steps li:last-child { border-bottom:none; }
  .gd-steps li::before { content:counter(gd-step); width:22px; height:22px; border-radius:50%; background:rgba(59,130,246,0.2); color:#7eb8f7; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
  .gd-steps li span { color:#a8b8cc; font-size:13px; line-height:1.65; }
  .gd-warn        { background:rgba(217,119,6,0.12); border:1px solid rgba(217,119,6,0.4); border-radius:8px; padding:10px 14px; font-size:12px; color:#f0a832; line-height:1.6; margin-top:10px; }
  .gd-tip         { background:rgba(39,174,96,0.12); border:1px solid rgba(39,174,96,0.4); border-radius:8px; padding:10px 14px; font-size:12px; color:#4ecb82; line-height:1.6; margin-top:10px; }
  .gd-danger      { background:rgba(192,57,43,0.12); border:1px solid rgba(192,57,43,0.4); border-radius:8px; padding:10px 14px; font-size:12px; color:#e06b5f; line-height:1.6; margin-top:10px; }
  .gd-table       { width:100%; border-collapse:collapse; font-size:12px; }
  .gd-table th    { text-align:left; font-size:10px; font-weight:800; color:#8fa3ba; text-transform:uppercase; letter-spacing:0.06em; padding:6px 10px; border-bottom:1px solid rgba(255,255,255,0.09); }
  .gd-table td    { padding:9px 10px; border-bottom:1px solid rgba(255,255,255,0.06); color:#a8b8cc; vertical-align:top; font-size:12px; line-height:1.6; }
  .gd-table td:first-child { color:#dce6f0; font-weight:600; }
  .gd-table tr:last-child td { border-bottom:none; }
  .gd-formula     { background:rgba(59,130,246,0.09); border-left:2px solid #4d8fd4; border-radius:0 8px 8px 0; padding:10px 14px; font-family:'Courier New',monospace; font-size:12px; color:#a8ccf0; margin:10px 0; line-height:1.8; }
  .gd-flow        { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
  .gd-flow-row    { display:flex; align-items:center; gap:10px; padding:9px 12px; background:rgba(255,255,255,0.04); border-radius:8px; font-size:12px; color:#a8b8cc; }
  .gd-2col        { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  @media(max-width:560px){ .gd-2col { grid-template-columns:1fr; } }
`

// ─── Badge ────────────────────────────────────────────────────
function Badge({ children, color = 'gold' }) {
  const cfg = {
    gold:   { bg: 'rgba(201,168,76,0.12)',  text: '#C9A84C'  },
    green:  { bg: 'rgba(39,174,96,0.12)',   text: '#27ae60'  },
    red:    { bg: 'rgba(192,57,43,0.12)',   text: '#C0392B'  },
    orange: { bg: 'rgba(217,119,6,0.12)',   text: '#D97706'  },
    blue:   { bg: 'rgba(59,130,246,0.12)',  text: '#3B82F6'  },
    gray:   { bg: 'rgba(107,122,153,0.12)', text: '#6b7a99'  },
    purple: { bg: 'rgba(139,92,246,0.12)',  text: '#8B5CF6'  },
  }[color] || { bg: 'rgba(201,168,76,0.12)', text: '#C9A84C' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.text, margin:'2px 3px 2px 0', whiteSpace:'nowrap' }}>
      {children}
    </span>
  )
}

// ─── Seksyon kòmpozan ─────────────────────────────────────────
function CardSection({ icon, title, sub, children }) {
  return (
    <div className="gd-card">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <div style={{ width:34, height:34, borderRadius:9, background:'rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:D.gold, flexShrink:0 }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:0 }}>{title}</p>
          {sub && <p style={{ fontSize:11, color:"#a8b8cc", margin:'1px 0 0' }}>{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ─── SEKSYON: VUE ANSANM ────────────────────────────────────
function SectionVue() {
  return (
    <>
      <CardSection icon={<BookOpen size={16}/>} title="Kouman sistèm lan fonksyone" sub="Relasyon ant tou 2 modil yo">
        <p style={{ fontSize:12, color:"#a8b8cc", lineHeight:1.65, marginBottom:12 }}>
          Mikwo Kredi gen 2 pati ki travay ansanm: <strong style={{color:D.text}}>Kanè Epay</strong> (kont epay pou kliyan) ak <strong style={{color:D.text}}>Prè</strong> (mikwo kredi). Tou 2 pataje yon sèl kès lajan kote admin enjekte kapital chak maten.
        </p>
        <div className="gd-flow">
          <div className="gd-flow-row"><PiggyBank size={14} style={{color:D.purple,flexShrink:0}}/><span><strong style={{color:D.text}}>Admin</strong> enjekte kapital jounen an anvan kès ouvri</span></div>
          <div style={{ display:'flex', justifyContent:'center', color:'#8fa3ba', fontSize:20 }}>↓</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <div className="gd-flow-row"><ArrowDownCircle size={13} style={{color:D.green,flexShrink:0}}/><span>Kliyan <strong style={{color:D.text}}>depoze / retire</strong> Kanè Epay</span></div>
            <div className="gd-flow-row"><DollarSign size={13} style={{color:D.blue,flexShrink:0}}/><span>Kesye <strong style={{color:D.text}}>dekèse prè</strong> pou kliyan</span></div>
          </div>
          <div style={{ display:'flex', justifyContent:'center', color:'#8fa3ba', fontSize:20 }}>↓</div>
          <div className="gd-flow-row"><Lock size={13} style={{color:D.orange,flexShrink:0}}/><span><strong style={{color:D.text}}>Fèmen kès</strong> — denye kontwòl + kalkil diferans lajan fizik</span></div>
        </div>
      </CardSection>

      <div className="gd-2col">
        <div className="gd-card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <CreditCard size={14} style={{color:D.green}}/><strong style={{fontSize:13,color:D.text}}>Kanè Epay</strong>
          </div>
          <p style={{ fontSize:12, color:"#a8b8cc", lineHeight:1.6, margin:0 }}>Kliyan ouvri kont, depoze ak retire lajan. Foto KYC, istwa konplè, resi otomatik.</p>
        </div>
        <div className="gd-card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <DollarSign size={14} style={{color:D.blue}}/><strong style={{fontSize:13,color:D.text}}>Prè Mikwo Kredi</strong>
          </div>
          <p style={{ fontSize:12, color:"#a8b8cc", lineHeight:1.6, margin:0 }}>4 tip kalkil enterè. Kalandriye otomatik. Deteksyon reta. Enterè kouru si an reta.</p>
        </div>
      </div>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 8px' }}>Kapital disponib — fòmil kalkil</p>
        <div className="gd-formula">
Disponib =<br/>
&nbsp;&nbsp;+ Enjeksyon admin<br/>
&nbsp;&nbsp;+ Ranbousman prè kliyan<br/>
&nbsp;&nbsp;+ Depo / Ouverture Kane Epay<br/>
&nbsp;&nbsp;− Dekèsman prè<br/>
&nbsp;&nbsp;− Retrè Kane Epay
        </div>
        <div className="gd-tip">Chak retrè Kane Epay ak chak prè dekèse soustre dirèkteman nan kapital la. Yon sèl pool lajan pou tou 2 modil yo.</div>
      </div>
    </>
  )
}

// ─── SEKSYON: KANÈ EPAY ──────────────────────────────────────
function SectionKane() {
  return (
    <>
      <CardSection icon={<Users size={16}/>} title="Kreye yon nouvo kont" sub="Etap pou etap">
        <ol className="gd-steps">
          <li><span>Klike <strong style={{color:D.text}}>Nouvo Kont</strong> nan kwen anwo adwat paj Kane Epay la</span></li>
          <li><span>Ranpli <strong style={{color:D.text}}>Prenon, Non, NIF/CIN, Telefòn</strong> kliyan an</span></li>
          <li><span>Pran <strong style={{color:D.text}}>foto kliyan</strong> ak <strong style={{color:D.text}}>foto kat idantite</strong> — enpòtan pou KYC</span></li>
          <li><span>Mete referans fanmi: relasyon + non (egzanp: Manman — Marie Pierre)</span></li>
          <li><span>Antre montan ouverture, retire frè kanè ak montan bloke si nesesè</span></li>
          <li><span>Chwazi metòd peman epi konfime. <strong style={{color:D.text}}>Resi enprime otomatikman.</strong></span></li>
        </ol>
      </CardSection>

      <div className="gd-2col">
        <div className="gd-card">
          <p style={{ fontSize:13, fontWeight:800, color:D.green, margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}><ArrowDownCircle size={13}/> Fè yon Depo</p>
          <ol className="gd-steps">
            <li><span>Klike <strong style={{color:D.text}}>Depo</strong> sou kont kliyan an</span></li>
            <li><span>Antre montan, metòd, referans si nesesè</span></li>
            <li><span>Konfime — balans ak kapital mizajou imedyatman</span></li>
          </ol>
        </div>
        <div className="gd-card">
          <p style={{ fontSize:13, fontWeight:800, color:D.red, margin:'0 0 10px', display:'flex', alignItems:'center', gap:6 }}><ArrowUpCircle size={13}/> Fè yon Retrè</p>
          <ol className="gd-steps">
            <li><span>Klike <strong style={{color:D.text}}>Retrè</strong> sou kont kliyan an</span></li>
            <li><span>Sistèm verifye balans disponib otomatikman</span></li>
            <li><span>Konfime — retrè soustre nan kapital tou</span></li>
          </ol>
          <div className="gd-warn" style={{marginTop:8}}>Si balans ensifizàn, sistèm bloke tranzaksyon an. Pa ka retire plis ke balans disponib.</div>
        </div>
      </div>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 10px' }}>Estati kont</p>
        <table className="gd-table">
          <thead><tr><th>Estati</th><th>Siyifikasyon</th></tr></thead>
          <tbody>
            <tr><td><Badge color="green">Aktif</Badge></td><td>Kont an bon estati, ka fè tout tranzaksyon</td></tr>
            <tr><td><Badge color="red">Inaktif</Badge></td><td>Kont dezaktive — pa ka fè tranzaksyon</td></tr>
            <tr><td><Badge color="orange">⚠ KYC</Badge></td><td>Foto kat idantite manke — mande kliyan an pou foto</td></tr>
            <tr><td><Badge color="green">✅ KYC</Badge></td><td>Dokiman idantite verifye — kont konplè</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── SEKSYON: PRÈ ────────────────────────────────────────────
function SectionPre() {
  return (
    <>
      <CardSection icon={<DollarSign size={16}/>} title="Kreye yon nouvo prè" sub="Kondisyon + etap">
        <div className="gd-danger" style={{marginBottom:12}}>Kliyan <strong>dwe gen yon kont Kanè Epay aktif</strong> anvan ou ka kreye yon prè pou li.</div>
        <ol className="gd-steps">
          <li><span>Klike <strong style={{color:D.text}}>Nouvo Prè</strong> epi chèche kont Kanè Epay kliyan an pa non, nimewo, oswa telefòn</span></li>
          <li><span>Chwazi <strong style={{color:D.text}}>tip kalkil enterè</strong> a (wè tablo anba)</span></li>
          <li><span>Antre montan kapital, taux enterè, dire (mwa), frekans peman</span></li>
          <li><span>Ajoute avalize (1 oswa 2) ak garanti byens si nesesè — yo parèt sou kontra</span></li>
          <li><span>Konfime — sistèm jenere kalandriye konplè otomatikman + enprime kontra avèk siyati</span></li>
        </ol>
      </CardSection>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 10px' }}>4 tip kalkil enterè</p>
        <table className="gd-table">
          <thead><tr><th>Tip</th><th>Kòman li fonksyone</th><th>Pou ki moun</th></tr></thead>
          <tbody>
            <tr>
              <td><Badge color="blue">📊 Flat</Badge></td>
              <td>Enterè kalkile sou kapital total. Peman egal tout tan — senp pou esplike.</td>
              <td>Prè kout dire, machann</td>
            </tr>
            <tr>
              <td><Badge color="gold">📉 Degressif</Badge></td>
              <td>Enterè kalkile sou rès kapital. Peman egal men enterè diminye chak fwa.</td>
              <td>Prè estanda (defòt)</td>
            </tr>
            <tr>
              <td><Badge color="green">📐 Konstant</Badge></td>
              <td>Kapital egal chak peman. Total peman diminye chak fwa — kliyan ekonomize.</td>
              <td>Kliyan ki vle peye mwens</td>
            </tr>
            <tr>
              <td><Badge color="orange">☀️ Bous Solèy</Badge></td>
              <td>Peman fiks chak jou × nombre jou. Pa gen taux % — enterè = Total − Kapital.</td>
              <td>Machann joualye, tontine</td>
            </tr>
          </tbody>
        </table>
      </div>

      <CardSection icon={<ArrowDownCircle size={16}/>} title="Anrejistre yon peman" sub="Peman konplè oswa pasyèl">
        <ol className="gd-steps">
          <li><span>Klike <strong style={{color:D.text}}>Peman</strong> sou prè a oswa ouvri detay epi klike <strong style={{color:D.text}}>Anrejistre Peman</strong></span></li>
          <li><span>Antre montan — klike <strong style={{color:D.text}}>Tout, ½, ¼</strong> pou ranpli rapid</span></li>
          <li><span>Chwazi metòd peman (Kach, MonCash, NatCash, etc.) ak referans si nesesè</span></li>
          <li><span>Konfime — sistèm aloke peman an sou echeans ki pi ansyen yo <em>anvan</em></span></li>
        </ol>
        <div className="gd-tip">Resi peman enprime otomatikman avèk lis dat echeans ki fèk peye yo ak estati yo (✅ Peye / ½ Pasyèl).</div>
      </CardSection>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 10px' }}>Estati prè</p>
        <table className="gd-table">
          <thead><tr><th>Estati</th><th>Siyifikasyon</th><th>Aksyon</th></tr></thead>
          <tbody>
            <tr><td><Badge color="orange">Antant</Badge></td><td>Apwouve men pa dekèse ankò</td><td>Fè dekèsman</td></tr>
            <tr><td><Badge color="green">Aktif</Badge></td><td>Prè an kous, peman ap fèt nòmalman</td><td>Suiv kalandriye</td></tr>
            <tr><td><Badge color="red">An Reta</Badge></td><td>Yon oswa plizyè echeans depase dat limit</td><td>Kontakte kliyan, kolekte</td></tr>
            <tr><td><Badge color="gray">Klotire</Badge></td><td>Prè totalman ranbouse — fini</td><td>Pa gen aksyon</td></tr>
            <tr><td><Badge color="red">Anile</Badge></td><td>Prè anile pa admin</td><td>Pa gen aksyon</td></tr>
          </tbody>
        </table>
      </div>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 6px' }}>Enterè kouru — c'est quoi?</p>
        <p style={{ fontSize:12, color:"#a8b8cc", lineHeight:1.65, margin:'0 0 8px' }}>Si yon echeans pa peye nan dat limit li, sistèm kalkile enterè siplemantè <strong style={{color:D.text}}>chak jou</strong> pou chak echeans an reta.</p>
        <div className="gd-formula">
Enterè Kouru = Balans × (Taux / 30) × Jou Reta
        </div>
        <div className="gd-warn">Plis kliyan an an reta, plis li dwe. Bous Solèy pa gen enterè kouru paske taux = 0.</div>
      </div>
    </>
  )
}

// ─── SEKSYON: KAPITAL ────────────────────────────────────────
function SectionKapital() {
  return (
    <>
      <CardSection icon={<PiggyBank size={16}/>} title="Enjekte Kapital (Admin sèlman)" sub="Fè sa chak maten anvan kès ouvri">
        <div className="gd-warn" style={{marginBottom:12}}>Sèlman itilizatè ki gen wòl <strong>Admin</strong> ka enjekte kapital.</div>
        <ol className="gd-steps">
          <li><span>Ale nan paj <strong style={{color:D.text}}>Prè</strong> — klike bouton <strong style={{color:D.text}}>Kapital</strong> nan header</span></li>
          <li><span>Antre montan lajan fizik ou mete disponib jounen an</span></li>
          <li><span>Ajoute yon nòt opsyonèl (sous lajan, rezon, etc.)</span></li>
          <li><span>Konfime — kapital disponib mizajou imedyatman pou tou 2 modil yo</span></li>
        </ol>
        <div className="gd-tip">Enjekte kapital la chak maten, anvan kesye yo kòmanse travay. Sa asire sistèm lan ka trete tout tranzaksyon jounen an.</div>
      </CardSection>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 10px' }}>Efè chak mouvman sou kapital</p>
        <table className="gd-table">
          <thead><tr><th>Mouvman</th><th>Efè</th></tr></thead>
          <tbody>
            <tr><td>Admin enjekte lajan</td><td><Badge color="green">+ Ogmante</Badge></td></tr>
            <tr><td>Kliyan depoze nan Kane Epay</td><td><Badge color="green">+ Ogmante</Badge></td></tr>
            <tr><td>Kliyan ranbouse yon prè</td><td><Badge color="green">+ Ogmante</Badge></td></tr>
            <tr><td>Kesye dekèse yon prè</td><td><Badge color="red">− Diminye</Badge></td></tr>
            <tr><td>Kliyan retire nan Kane Epay</td><td><Badge color="red">− Diminye</Badge></td></tr>
          </tbody>
        </table>
        <div className="gd-danger" style={{marginTop:10}}>Si kapital disponib rive 0, sistèm bloke tout nouvo prè ak retrè Kane Epay. Admin dwe enjekte plis lajan pou kontinye.</div>
      </div>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 8px' }}>Konsèy: ki montan pou enjekte?</p>
        <p style={{ fontSize:12, color:"#a8b8cc", lineHeight:1.65, margin:0 }}>
          Konte <strong style={{color:D.text}}>lajan fizik ki nan kès la</strong> maten an. Konpare l ak <strong style={{color:D.text}}>kapital disponib</strong> ki nan sistèm lan. Si yo diferan, enjekte diferans lan pou yo matche anvan ou kòmanse jounen an.
        </p>
      </div>
    </>
  )
}

// ─── SEKSYON: FÈMEN KÈS ─────────────────────────────────────
function SectionKes() {
  return (
    <>
      <CardSection icon={<Lock size={16}/>} title="Pwosesis fèmen kès" sub="2 etap — yon sèl fwa pa jounen">
        <div className="gd-danger" style={{marginBottom:12}}>Fèmen kès ap <strong>bloke tou 2 paj yo</strong> (Kanè Epay + Prè) jiskaske demen maten. Aksyon sa <strong>pa ka defèt</strong> san entèvansyon admin nan Supabase.</div>

        <p style={{ fontSize:12, fontWeight:800, color:D.gold, margin:'4px 0 8px' }}>Etap 1 — Verifye rezime jounen an</p>
        <ol className="gd-steps" style={{marginBottom:14}}>
          <li><span>Klike <strong style={{color:D.text}}>Fèmen Kès</strong> nan nenpòt paj (Kane Epay oswa Prè)</span></li>
          <li><span>Verifye <strong style={{color:D.text}}>total depo, retrè, nouvo kont</strong> Kane Epay jounen an</span></li>
          <li><span>Verifye <strong style={{color:D.text}}>dekèsman prè, koleksyon, prè aktif/reta</strong> mwa a</span></li>
          <li><span>Ajoute nòt si gen pwoblèm oswa obsèvasyon</span></li>
          <li><span>Klike <strong style={{color:D.text}}>Kontinye → Konfimasyon</strong></span></li>
        </ol>

        <p style={{ fontSize:12, fontWeight:800, color:D.gold, margin:'4px 0 8px' }}>Etap 2 — Kontwòl lajan fizik</p>
        <ol className="gd-steps">
          <li><span><strong style={{color:D.text}}>Konte</strong> tout lajan fizik ki nan kès la — epi apre antre l</span></li>
          <li><span>Antre montan an nan champ <strong style={{color:D.text}}>Montan Lajan Fizik nan Kès</strong></span></li>
          <li><span>Sistèm kalkile <strong style={{color:D.text}}>diferans</strong> = Fizik − Nèt Sistèm</span></li>
          <li><span>Verifye diferans — si twò gwo, rechèche rezon an anvan ou fèmen</span></li>
          <li><span>Klike <strong style={{color:D.text}}>Fèmen Kès Definitiv</strong></span></li>
        </ol>
      </CardSection>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 10px' }}>Entèprete diferans lajan</p>
        <table className="gd-table">
          <thead><tr><th>Diferans</th><th>Siyifikasyon</th><th>Aksyon rekòmande</th></tr></thead>
          <tbody>
            <tr><td><Badge color="green">0.00 HTG</Badge></td><td>Balans kòrèkt</td><td>Fèmen nòmalman</td></tr>
            <tr><td><Badge color="orange">+X HTG</Badge></td><td>Lajan anplis — ka gen erè nan yon depo</td><td>Verifye istwa tranzaksyon jounen an</td></tr>
            <tr><td><Badge color="red">−X HTG</Badge></td><td>Lajan mank — ka gen retrè ki pa anrejistre</td><td>Verifye tout tranzaksyon, kontakte admin</td></tr>
          </tbody>
        </table>
        <div className="gd-tip">Diferans la anrejistre otomatikman nan nòt kès la pou admin ka revize demen.</div>
        <div className="gd-warn" style={{marginTop:8}}>Si diferans depase 500 HTG, kontakte admin <strong>anvan</strong> ou fèmen definitiv.</div>
      </div>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 8px' }}>Apre kès fèmen</p>
        <p style={{ fontSize:12, color:"#a8b8cc", lineHeight:1.65, margin:'0 0 8px' }}>
          Tou 2 paj bloke otomatikman. Bouton <strong style={{color:D.text}}>Depo, Retrè, Nouvo Kont, Peman Prè, Nouvo Prè</strong> yo tout dezaktive jiskaske demen maten.
        </p>
        <div className="gd-tip">Si ou fèmen kès pa aksidan, yon admin ka kouri SQL sa nan Supabase pou reouvri: <br/><code style={{fontSize:11, color:'#93BBEF'}}>DELETE FROM pre_rapo_kesye WHERE date_rapo = (NOW() - INTERVAL '5 hours')::date;</code></div>
      </div>
    </>
  )
}

// ─── SEKSYON: WÒLAK AKS ─────────────────────────────────────
function SectionRoles() {
  return (
    <>
      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 10px' }}>Wòl ak pèmisyon</p>
        <table className="gd-table">
          <thead><tr><th>Wòl</th><th>Aksè</th><th>Restriksyon</th></tr></thead>
          <tbody>
            <tr>
              <td><Badge color="gold">Admin</Badge></td>
              <td>Tout fonksyon + Enjeksyon kapital + Wè tout estatistik</td>
              <td>Pa gen</td>
            </tr>
            <tr>
              <td><Badge color="green">Kesye</Badge></td>
              <td>Kreye kont Kane, depo/retrè, kreye prè, anrejistre peman, fèmen kès</td>
              <td>Pa ka enjekte kapital</td>
            </tr>
            <tr>
              <td><Badge color="blue">Jesyon Estòk</Badge></td>
              <td>Modil estòk sèlman</td>
              <td>Pa gen aksè Mikwo Kredi</td>
            </tr>
            <tr>
              <td><Badge color="gray">Obsèvatè</Badge></td>
              <td>Wè sèlman — pa ka modifye anyen</td>
              <td>Tout aksyon dezaktive</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="gd-card">
        <p style={{ fontSize:13, fontWeight:800, color:D.text, margin:'0 0 10px' }}>Règ sekirite pou kesye</p>
        <table className="gd-table">
          <thead><tr><th>Règ</th><th>Detay</th></tr></thead>
          <tbody>
            <tr><td>Yon sèl kès pa jounen</td><td>Kesye ka fèmen kès sèlman yon fwa pa jounen. Pa ka refèmen jiskaske demen.</td></tr>
            <tr><td>Kès fèmen = tout bloke</td><td>Apre fèmen kès, okenn tranzaksyon p ap pase — ni Kanè ni Prè.</td></tr>
            <tr><td>Idantifikasyon visib</td><td>Non ak wòl kesye a parèt nan header pou tout moun wè ki moun ki konekte.</td></tr>
            <tr><td>Istwa konplè</td><td>Chak tranzaksyon anrejistre ak non kesye a, dat, ak lè egzak.</td></tr>
          </tbody>
        </table>
      </div>

      <CardSection icon={<CheckCircle size={16}/>} title="Konsèy pratik pou kesye" sub="Bèl pratik jounen an">
        <ol className="gd-steps">
          <li><span>Verifye <strong style={{color:D.text}}>kapital disponib</strong> nan tèt paj Prè a anvan ou kòmanse jounen an</span></li>
          <li><span>Toujou pran <strong style={{color:D.text}}>foto KYC</strong> pou nouvo kont — evite pwoblèm verifikasyon apre</span></li>
          <li><span>Pou prè Bous Solèy: asire <strong style={{color:D.text}}>Peman/jou × Nombre jou &gt; Kapital</strong> — osinon sistèm rejte l</span></li>
          <li><span>Avan fèmen kès: konte lajan fizik <em>premye</em>, apre antre l nan sistèm — pa devan</span></li>
          <li><span>Si diferans &gt; 500 HTG, kontakte admin anvan ou fèmen kès definitiv</span></li>
          <li><span>Si yon kliyan pa ka jwenn kont li, chèche pa <strong style={{color:D.text}}>non, nimewo kont, oswa telefòn</strong></span></li>
        </ol>
      </CardSection>
    </>
  )
}

// ─── TABS CONFIG ─────────────────────────────────────────────
const TABS = [
  { id:'vue',     label:'Vue Ansanm',  icon:<BookOpen size={13}/>,     comp: SectionVue    },
  { id:'kane',    label:'Kanè Epay',   icon:<CreditCard size={13}/>,   comp: SectionKane   },
  { id:'pre',     label:'Prè',         icon:<DollarSign size={13}/>,   comp: SectionPre    },
  { id:'kapital', label:'Kapital',     icon:<PiggyBank size={13}/>,    comp: SectionKapital},
  { id:'kes',     label:'Fèmen Kès',   icon:<Lock size={13}/>,         comp: SectionKes    },
  { id:'roles',   label:'Wòl & Aksè', icon:<Users size={13}/>,         comp: SectionRoles  },
]

// ═══════════════════════════════════════════════════════════════
// KONPOZANT PRENSIPAL
// ═══════════════════════════════════════════════════════════════
export default function MikwoKrediGuide() {
  const [activeTab, setActiveTab] = useState('vue')

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = SHARED_STYLES + GUIDE_STYLES
    document.head.appendChild(el)
    return () => document.head.removeChild(el)
  }, [])

  const ActiveComp = TABS.find(t => t.id === activeTab)?.comp || SectionVue

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0, fontFamily:'DM Sans, sans-serif', padding:'14px 14px 80px', maxWidth:900, margin:'0 auto' }}>

      {/* ── Header ── */}
      <div style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', borderRadius:14, padding:'16px 18px', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <BookOpen size={20} style={{color:D.gold}}/>
          <h1 style={{ fontSize:18, fontWeight:900, color:D.gold, margin:0 }}>Gid Mikwo Kredi</h1>
        </div>
        <p style={{ fontSize:12, color:"#a8b8cc", margin:0, lineHeight:1.6 }}>
          Gid konplè pou kesye ak admin — Kanè Epay, Prè, Kapital, Fèmen Kès, ak Pèmisyon.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="gd-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`gd-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Kontni ── */}
      <div key={activeTab} style={{ animation:'fadeUp 0.2s ease' }}>
        <ActiveComp />
      </div>
    </div>
  )
}