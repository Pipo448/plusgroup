// src/pages/enterprise/pre/preConstants.js
// ═══════════════════════════════════════════════════════════════
// PRÈ (Mikwo Kredi) — Konstan + stil siplemantè
// Baz design lan soti nan Kanè Epay (KANE_STYLES): Barlow Condensed + Manrope,
// hero nwa, kat blan, koulè siyati lò.
// ═══════════════════════════════════════════════════════════════
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import React from 'react'

const C = { green: '#16a34a', red: '#dc2626', orange: '#d97706', gray: '#6b7080', slate: '#64748b', blue: '#2563eb', gold: '#8A6508' }
const a = (hex, al) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${al})`
}

export const STATUTS = {
  actif:   { label: 'Aktif',               color: C.green,  bg: a(C.green, .1),  icon: React.createElement(CheckCircle, {size:12}) },
  reta:    { label: 'An Reta',             color: C.red,    bg: a(C.red, .09),   icon: React.createElement(AlertCircle, {size:12}) },
  attente: { label: 'An Atant Apwobasyon', color: C.orange, bg: a(C.orange, .11),icon: React.createElement(Clock, {size:12}) },
  cloture: { label: 'Klotire',             color: C.slate,  bg: a(C.slate, .11), icon: React.createElement(CheckCircle, {size:12}) },
  annule:  { label: 'Rejte',               color: C.gray,   bg: a(C.gray, .1),   icon: React.createElement(XCircle, {size:12}) },
}

export const STATUT_ECH = {
  paye:    { label: 'Peye',   color: C.green,  bg: a(C.green, .1),   icon: React.createElement(CheckCircle, {size:11}) },
  partiel: { label: 'Pasyèl', color: C.orange, bg: a(C.orange, .11), icon: React.createElement(Clock, {size:11}) },
  reta:    { label: 'Reta',   color: C.red,    bg: a(C.red, .09),    icon: React.createElement(AlertCircle, {size:11}) },
  attente: { label: 'Antant', color: C.gray,   bg: a(C.gray, .1),    icon: React.createElement(Clock, {size:11}) },
}

export const PERIODES = [
  { value: 'jounal',    label: 'Chak Jou' },
  { value: 'semaine',   label: 'Semèn'    },
  { value: 'biweekly',  label: '2 Semèn'  },
  { value: 'mois',      label: 'Mwa'      },
  { value: 'trimestre', label: 'Trimès'   },
]

export const TIP_KALKIL = [
  { value: 'flat',        label: 'Flat (Pwogresif)',       desc: 'Enterè kalkile sou kapital total. Peman yo egal tout tan.',           color: '#2563eb', emoji: '📊' },
  { value: 'declining',   label: 'Degressif (Declining)',  desc: 'Enterè kalkile sou rès kapital ki rete. Peman egal, enterè diminye.', color: '#8A6508', emoji: '📉' },
  { value: 'constant',    label: 'Amortissement Constant', desc: 'Kapital egal chak peman. Total peman diminye chak fwa.',               color: '#16a34a', emoji: '📐' },
  { value: 'bous_soleil', label: 'Bous Solèy (Jounalye)',  desc: 'Kliyan peye yon montan fiks chak jou pou yon kantite jou fiks.',      color: '#d97706', emoji: '☀️' },
]

// Filtè estati nan lis la
export const FILTRES = [
  { val: null,      label: 'Tout'    },
  { val: 'attente', label: 'An atant' },
  { val: 'actif',   label: 'Aktif'   },
  { val: 'reta',    label: 'An reta' },
  { val: 'cloture', label: 'Klotire' },
  { val: 'annule',  label: 'Rejte'   },
]

// ─── CSS siplemantè pou Prè (ajoute sou KANE_STYLES) ─────────
export const PRE_STYLES = `
/* filtè estati (chips ki ka glise sou mobil) */
.pre-ftabs{display:flex;gap:6px;padding:5px;background:var(--card);border:1px solid var(--border);border-radius:18px;overflow-x:auto;scrollbar-width:none;flex:0 1 auto;max-width:100%}
.pre-ftabs::-webkit-scrollbar{display:none}
.pre-ftabs button{border:0;background:transparent;height:42px;padding:0 15px;border-radius:13px;font:700 13px var(--body);color:var(--muted);cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:7px;transition:all .2s}
.pre-ftabs button:hover{color:var(--ink);background:var(--soft)}
.pre-ftabs button.on{background:var(--night);color:#f2f1ec}
.pre-ftabs button .dot{width:7px;height:7px;border-radius:50%}
@media(max-width:639px){.pre-ftabs{flex:1 1 100%}}

/* kat stat ki klike (filtè) */
.pre-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:1000px){.pre-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.pre-stats{gap:12px}}
button.ke-stat{text-align:left;font:inherit;color:inherit;cursor:pointer;width:100%}
button.ke-stat.on{border-color:var(--c);box-shadow:0 0 0 3px var(--cbg2),0 22px 40px -22px rgba(20,21,26,.3)}
.ke-stat .go{position:absolute;right:18px;bottom:18px;font-size:11px;font-weight:800;color:var(--muted);opacity:0;transform:translateX(-4px);transition:all .25s}
button.ke-stat:hover .go{opacity:1;transform:none}

/* blòk aktivite + PAR */
.pre-panel{background:var(--card);border:1px solid var(--border);border-radius:24px;padding:20px 22px}
@media(max-width:520px){.pre-panel{padding:16px;border-radius:20px}}
.pre-four{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
@media(max-width:820px){.pre-four{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pre-par{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media(max-width:600px){.pre-par{grid-template-columns:1fr}}
.pre-par-c{border-radius:18px;padding:16px;background:var(--cbg)}
.pre-par-c .v{margin:6px 0 2px;font-family:var(--display);font-weight:800;font-size:44px;line-height:.9;color:var(--c)}
.pre-par-c .v small{font-size:.45em}
.pre-par-c .s{margin:0 0 12px;font-size:12.5px;font-weight:700;color:var(--muted)}
.pre-note{margin:12px 0 0;font-size:12px;color:var(--muted);font-weight:600;line-height:1.5}

/* kat prè */
.pre-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:16px;scroll-margin-top:90px}
@media(max-width:420px){.pre-grid{grid-template-columns:1fr}}
.pre-card{position:relative;overflow:hidden;background:var(--card);border:1px solid var(--border);border-radius:24px;padding:18px;cursor:pointer;display:flex;flex-direction:column;gap:14px;outline:none;animation:keIn .55s cubic-bezier(.22,1,.36,1) backwards;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,border-color .3s}
.pre-card::before{content:'';position:absolute;width:150px;height:150px;border-radius:50%;right:-50px;top:-70px;background:var(--sbg);transition:transform .5s cubic-bezier(.22,1,.36,1)}
.pre-card:hover,.pre-card:focus-visible{transform:translateY(-4px);box-shadow:0 22px 40px -22px rgba(20,21,26,.32);border-color:rgba(20,21,26,.14)}
.pre-card:hover::before{transform:scale(1.15)}
.pre-card>*{position:relative}
.pre-card.reta{border-color:rgba(220,38,38,.28)}
.pre-head{display:flex;gap:12px;align-items:flex-start;min-width:0}
.pre-tags{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
.pre-amt{text-align:right;flex:none}
.pre-amt .v{margin:0;font-family:var(--display);font-weight:800;font-size:32px;line-height:.9;color:var(--ink);white-space:nowrap}
.pre-amt .v small{font-size:.4em;color:var(--muted);margin-left:4px}
.pre-prog{padding:14px 16px;border-radius:18px;background:var(--soft)}
.pre-prog-top{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:12px}
.pre-amt-v{margin:6px 0 0;font-family:var(--display);font-weight:800;font-size:36px;line-height:.9;color:var(--ink);white-space:nowrap}
.pre-amt-v small{font-size:.38em;color:var(--muted);margin-left:5px;letter-spacing:.05em}
.pre-prog-top .pct{font-family:var(--display);font-weight:800;font-size:28px;line-height:.9}
.pre-prog-row{display:flex;justify-content:space-between;gap:10px;margin-top:9px;font-size:12px;font-weight:700}

/* tip kalkil */
.pre-tips{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:479px){.pre-tips{grid-template-columns:1fr}}
.pre-tip{position:relative;display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:18px;border:1.5px solid var(--border);background:var(--card);cursor:pointer;text-align:left;font:inherit;color:var(--ink);transition:all .2s}
.pre-tip:hover{border-color:rgba(20,21,26,.2)}
.pre-tip .ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;flex:none;color:var(--c);background:var(--cbg);transition:all .2s}
.pre-tip .t{margin:0;font-weight:800;font-size:13.5px}
.pre-tip .d{margin:3px 0 0;font-size:12px;color:var(--muted);font-weight:600;line-height:1.4}
.pre-tip.on{border-color:var(--night);box-shadow:0 12px 24px -16px rgba(11,12,15,.5)}
.pre-tip.on .ic{background:var(--night);color:var(--gold)}
.pre-tip .ck{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;background:var(--gold);color:var(--night);display:grid;place-items:center;animation:kePop .25s}

/* pills frekans + bouton rapid klè */
.pre-pills{display:flex;gap:8px;flex-wrap:wrap}
.pre-pills button,.pre-quick button{border:1.5px solid var(--border);background:var(--card);border-radius:12px;padding:9px 14px;font:800 13px var(--body);color:var(--ink);cursor:pointer;transition:all .18s}
.pre-pills button:hover,.pre-quick button:hover{border-color:rgba(20,21,26,.25)}
.pre-pills button.on,.pre-quick button.on{background:var(--night);color:var(--gold);border-color:var(--night)}
.pre-quick{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.pre-quick button small{color:var(--muted);font-weight:700;margin-left:4px}
.pre-quick button:hover small{color:inherit}

/* chèche kont kanè */
.pre-ks{position:relative}
.pre-ks-list{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:20;background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:0 24px 44px -20px rgba(20,21,26,.35);animation:kePop .25s cubic-bezier(.22,1,.36,1)}
.pre-ks-item{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;border:0;border-bottom:1px solid var(--border);background:var(--card);cursor:pointer;text-align:left;font:inherit;color:var(--ink);transition:background .15s}
.pre-ks-item:last-child{border-bottom:0}
.pre-ks-item:hover{background:var(--soft)}
.pre-ks-sel{display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:var(--night);color:#f2f1ec;animation:kePop .3s cubic-bezier(.22,1,.36,1)}
.pre-ks-sel .x{margin-left:auto;width:34px;height:34px;border-radius:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#f2f1ec;display:grid;place-items:center;cursor:pointer}
.pre-ks-sel .x:hover{background:var(--gold);color:var(--night)}

/* kalandriye */
.pre-cal-btn{width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:18px;border:1px solid var(--border);background:var(--card);cursor:pointer;font:inherit;color:var(--ink);transition:all .2s}
.pre-cal-btn:hover{border-color:rgba(20,21,26,.2)}
.pre-cal-btn.open{border-radius:18px 18px 0 0;border-bottom-color:transparent}
.pre-cal-body{border:1px solid var(--border);border-top:0;border-radius:0 0 18px 18px;overflow:hidden;animation:keIn .3s backwards}
.pre-cal-sum{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:12px}
@media(max-width:479px){.pre-cal-sum{grid-template-columns:repeat(2,minmax(0,1fr))}}
.pre-next{margin:0 12px 12px;padding:14px 16px;border-radius:16px;background:var(--night);color:#f2f1ec;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.pre-next .v{font-family:var(--display);font-weight:800;font-size:30px;line-height:1;color:var(--gold);white-space:nowrap}
.pre-table{max-height:340px;overflow:auto}
.pre-table table{width:100%;border-collapse:collapse;font-size:12.5px;min-width:480px}
.pre-table th{position:sticky;top:0;background:#fbfaf7;text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:9px 10px;border-bottom:1px solid var(--border);white-space:nowrap}
.pre-table td{padding:9px 10px;border-bottom:1px solid var(--border);white-space:nowrap;font-weight:600}
.pre-table td.n{font-family:var(--display);font-weight:800;font-size:15px}
.pre-table tr.late td{background:rgba(220,38,38,.04)}
.pre-table tfoot td{background:#fbfaf7;font-weight:800;border-bottom:0}
.pre-table .r{text-align:right}

/* avalize */
.pre-aval{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:479px){.pre-aval{grid-template-columns:1fr}}
.pre-aval>div{padding:12px 14px;border-radius:16px;border:1px solid var(--border);display:flex;gap:10px;align-items:center;min-width:0}
.pre-add{display:inline-flex;align-items:center;gap:7px;padding:10px 14px;border-radius:13px;border:1.5px dashed rgba(20,21,26,.2);background:transparent;color:var(--muted);font:700 13px var(--body);cursor:pointer;transition:all .2s}
.pre-add:hover{border-color:var(--night);color:var(--ink)}

/* apwobasyon */
.pre-approve{border-radius:20px;padding:16px;background:rgba(217,119,6,.07);border:1px solid rgba(217,119,6,.28)}
.pre-approve p{margin:0 0 12px;font-size:13px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:8px}

/* minit (kapital) */
.pre-timer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-radius:20px;background:var(--night);color:#f2f1ec}
.pre-timer .v{font-family:var(--display);font-weight:800;font-size:46px;line-height:.9;color:var(--c);font-variant-numeric:tabular-nums}

/* Kòb antre/soti */
.cf-bottom{grid-template-columns:1fr 1fr!important}
.cf-bottom>:first-child{grid-column:1/-1}
.cf-period{display:flex;flex-direction:column;gap:10px;min-width:260px}
.cf-dates{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cf-dates label{display:block;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,241,236,.55);margin-bottom:5px}
.cf-dates input{width:100%;height:44px;padding:0 10px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#f2f1ec;font:700 13px var(--body);color-scheme:dark;outline:none}
.cf-dates input:focus{border-color:var(--gold);box-shadow:0 0 0 3px rgba(255,200,61,.25)}
.cf-presets{display:flex;gap:6px;flex-wrap:wrap}
.cf-presets button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:rgba(242,241,236,.8);border-radius:10px;padding:7px 11px;font:700 12px var(--body);cursor:pointer;transition:all .18s}
.cf-presets button:hover{background:rgba(255,255,255,.1);color:#fff}
.cf-presets button.on{background:var(--gold);color:var(--night);border-color:var(--gold)}
.cf-mods{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
@media(max-width:1000px){.cf-mods{grid-template-columns:1fr}}
.cf-mod{position:relative;overflow:hidden;background:var(--card);border:1px solid var(--border);border-radius:24px;padding:22px;animation:keIn .6s cubic-bezier(.22,1,.36,1) backwards;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s}
.cf-mod:hover{transform:translateY(-4px);box-shadow:0 22px 40px -22px rgba(20,21,26,.3)}
.cf-mod::before{content:'';position:absolute;width:170px;height:170px;border-radius:50%;right:-50px;top:-80px;background:var(--cbg)}
.cf-mod>*{position:relative}
.cf-mod h3{margin:0;font-family:var(--display);font-weight:800;font-size:22px;letter-spacing:.04em;text-transform:uppercase}
.cf-mod .sub{margin:2px 0 0;font-size:12.5px;color:var(--muted);font-weight:600}
.cf-io{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 14px}
.cf-io>div{border-radius:16px;padding:12px 14px;background:var(--soft)}
.cf-io .v{margin:6px 0 0;font-family:var(--display);font-weight:800;font-size:26px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cf-split{height:8px;border-radius:99px;background:rgba(20,21,26,.07);display:flex;overflow:hidden;gap:2px}
.cf-split i{display:block;height:100%;transition:width 1.1s cubic-bezier(.22,1,.36,1)}
.cf-net{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:16px;padding-top:14px;border-top:1px dashed rgba(20,21,26,.16)}
.cf-net b{font-family:var(--display);font-weight:800;font-size:38px;line-height:.9;white-space:nowrap}
.cf-net b small{font-size:.4em;color:var(--muted);margin-left:4px}
`