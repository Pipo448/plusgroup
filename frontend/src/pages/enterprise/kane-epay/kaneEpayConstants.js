// src/pages/enterprise/kane-epay/kaneEpayConstants.js
// ═══════════════════════════════════════════════════════════════
// KANÈ EPAY — Konstan + stil (menm konsèp ak tablo Gym "Plus Fit")
// Tipografi: Barlow Condensed (gwo tit/chif) + Manrope (tèks)
// Hero fonse, kat blan, koulè siyati: LÒ (#FFC83D)
// ═══════════════════════════════════════════════════════════════

export const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Kach'      },
  { value: 'moncash',  label: 'MonCash'   },
  { value: 'natcash',  label: 'NatCash'   },
  { value: 'transfer', label: 'Virement'  },
  { value: 'card',     label: 'Kat Kredi' },
  { value: 'check',    label: 'Chèk'      },
]

export const FAMILY_RELATIONS = [
  'Manman','Papa','Sè','Frè','Kouzen','Kouzin',
  'Madanm','Mari','Bofis','Bofre','Belmè','Belsè',
  'Grann','Granpap','Pitit Fi','Pitit Gason','Tonton','Tante',
]

export const FRE_OUVERTURE = 250
export const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000]

export const FONT_DISPLAY = "'Barlow Condensed','Arial Narrow',sans-serif"
export const FONT_BODY    = "'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif"

// ─── Palèt ───────────────────────────────────────────────────
export const T = {
  night: '#0b0c0f', night2: '#16181e', line: 'rgba(255,255,255,0.08)',
  gold: '#FFC83D', goldDeep: '#E0A410', goldInk: '#8A6508',   // goldInk = tèks lò sou blan
  ink: '#14151a', muted: '#6b7080', card: '#ffffff', soft: '#f4f3ef', border: 'rgba(20,21,26,0.08)',
  green: '#16a34a', red: '#dc2626', orange: '#d97706', teal: '#0d9488', blue: '#2563eb', violet: '#6366f1',
  // vèsyon klè pou sou fon nwa
  greenD: '#4ade80', redD: '#ff7b7b', blueD: '#6ec8ff',
}

// hex → rgba (pou fon chip yo)
export const hexA = (hex, a) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export const TX_STYLES = {
  ouverture: { color: T.goldInk, bg: hexA(T.gold, 0.14),  label: 'Ouverture', icon: '🏦' },
  depot:     { color: T.green,   bg: hexA(T.green, 0.09), label: 'Depo',      icon: '↓'  },
  retrait:   { color: T.red,     bg: hexA(T.red, 0.08),   label: 'Retrè',     icon: '↑'  },
}

export const AVATAR_GRADIENTS = [
  ['#FFC83D', '#E0A410'], ['#60a5fa', '#2563eb'], ['#34d399', '#059669'],
  ['#a78bfa', '#6d28d9'], ['#fb923c', '#c2410c'], ['#f472b6', '#be185d'],
  ['#22d3ee', '#0e7490'], ['#94a3b8', '#334155'],
]

// Dat an kreyòl pou hero a
const JOU  = ['Dimanch','Lendi','Madi','Mèkredi','Jedi','Vandredi','Samdi']
const MWA  = ['Janvye','Fevriye','Mas','Avril','Me','Jen','Jiyè','Out','Septanm','Oktòb','Novanm','Desanm']
export const todayLabel = (d = new Date()) => `${JOU[d.getDay()]} ${d.getDate()} ${MWA[d.getMonth()]}`

// ═══════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════
export const KANE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Manrope:wght@500;600;700;800&display=swap');

.ke-scope{
  --night:#0b0c0f; --night2:#16181e; --line:rgba(255,255,255,.08);
  --gold:#FFC83D; --gold-deep:#E0A410; --gold-ink:#8A6508;
  --ink:#14151a; --muted:#6b7080; --card:#fff; --soft:#f4f3ef; --border:rgba(20,21,26,.08);
  --green:#16a34a; --red:#dc2626; --orange:#d97706;
  --display:'Barlow Condensed','Arial Narrow',sans-serif;
  --body:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;
  font-family:var(--body); color:var(--ink);
  -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent;
}
.ke-scope *,.ke-scope *::before,.ke-scope *::after{box-sizing:border-box}
.ke-scope button{font-family:inherit}
.ke-d{font-family:var(--display);font-weight:800;line-height:.95;font-variant-numeric:tabular-nums}
.ke-scope input[type=number]::-webkit-inner-spin-button,.ke-scope input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.ke-scope input[type=number]{-moz-appearance:textfield}

/* ── Animasyon ── */
@keyframes keIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
@keyframes kePop{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}
@keyframes keFade{from{opacity:0}to{opacity:1}}
@keyframes keFadeOut{to{opacity:0}}
@keyframes keUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes keDown{to{transform:translateY(100%)}}
@keyframes keOut{to{opacity:0;transform:translateY(10px) scale(.97)}}
@keyframes keGlow{0%,100%{transform:translate(0,0) scale(1);opacity:.6}50%{transform:translate(-40px,20px) scale(1.15);opacity:.9}}
@keyframes kePulse{0%{box-shadow:0 0 0 0 rgba(255,200,61,.6)}70%{box-shadow:0 0 0 9px rgba(255,200,61,0)}100%{box-shadow:0 0 0 0 rgba(255,200,61,0)}}
@keyframes kePulseRed{0%{box-shadow:0 0 0 0 rgba(255,123,123,.6)}70%{box-shadow:0 0 0 9px rgba(255,123,123,0)}100%{box-shadow:0 0 0 0 rgba(255,123,123,0)}}
@keyframes keShimmer{from{background-position:-400px 0}to{background-position:400px 0}}
@keyframes keFloat{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-4px) rotate(6deg)}}
@keyframes keSpin{to{transform:rotate(360deg)}}
@keyframes keShake{0%,100%{transform:none}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@keyframes keDraw{to{stroke-dashoffset:0}}
.ke-in{animation:keIn .6s cubic-bezier(.22,1,.36,1) backwards}
.ke-spin{animation:keSpin .8s linear infinite}
.ke-spinner{display:inline-block;flex:none;border-radius:50%;border:2px solid currentColor;border-top-color:transparent!important;animation:keSpin .75s linear infinite}

/* ── Paj ── */
.ke-page{max-width:1180px;margin:0 auto;padding:4px 0 110px;display:flex;flex-direction:column;gap:18px}
@media(min-width:640px){.ke-page{padding-bottom:40px}}

.ke-lockbar{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:20px;background:var(--night);color:#f2f1ec;box-shadow:0 18px 40px -22px rgba(11,12,15,.6)}
.ke-lockbar-ic{width:40px;height:40px;border-radius:13px;background:rgba(255,123,123,.14);color:#ff7b7b;display:grid;place-items:center;flex:none;animation:kePulseRed 2s infinite}
.ke-lockbar p{margin:0;font-size:13.5px;font-weight:600;color:rgba(242,241,236,.75)}
.ke-lockbar b{font-family:var(--display);font-size:19px;letter-spacing:.03em;text-transform:uppercase;color:#fff;display:block;font-weight:800}

/* ── HERO ── */
.ke-hero{position:relative;overflow:hidden;background:var(--night);color:#f2f1ec;border-radius:28px;padding:28px 32px;box-shadow:0 24px 50px -24px rgba(11,12,15,.55)}
.ke-hero-glow{position:absolute;right:120px;top:-200px;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.2),rgba(255,200,61,0) 65%);animation:keGlow 9s ease-in-out infinite;pointer-events:none}
.ke-hero-grid{position:absolute;inset:0;pointer-events:none;opacity:.5;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:22px 22px;-webkit-mask-image:linear-gradient(90deg,transparent 35%,#000);mask-image:linear-gradient(90deg,transparent 35%,#000)}
.ke-hero>*:not(.ke-hero-glow):not(.ke-hero-grid){position:relative;z-index:1}
.ke-hero-body{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:30px;align-items:stretch}
.ke-hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}
.ke-hero-head{display:flex;gap:16px;align-items:center;min-width:0}
.ke-logo{width:56px;height:56px;flex:none;border-radius:17px;background:var(--gold);color:var(--night);display:grid;place-items:center;box-shadow:0 10px 28px -8px rgba(255,200,61,.65)}
.ke-logo svg{animation:keFloat 3.2s ease-in-out infinite}
.ke-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(242,241,236,.6)}
.ke-live{width:8px;height:8px;border-radius:50%;background:var(--gold);animation:kePulse 2s infinite;flex:none}
.ke-live.off{background:#ff7b7b;animation:kePulseRed 2s infinite}
.ke-title{margin:4px 0 0;font-family:var(--display);font-weight:800;font-size:46px;line-height:.92;letter-spacing:.01em;text-transform:uppercase;color:#fff}
.ke-sub{margin:7px 0 0;font-size:13.5px;color:rgba(242,241,236,.6);font-weight:500}
.ke-hero-actions{display:flex;gap:10px;flex-wrap:wrap}
.ke-hero-bottom{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:end;margin-top:30px}
.ke-big-l{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(242,241,236,.6)}
.ke-big{font-family:var(--display);font-weight:800;font-size:88px;line-height:.86;color:var(--gold);margin:8px 0 0;white-space:nowrap;letter-spacing:-.005em}
.ke-big small{font-size:26px;color:rgba(242,241,236,.55);margin-left:10px;letter-spacing:.04em}
.ke-net{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:800;background:rgba(255,255,255,.06);border:1px solid var(--line)}
.ke-glass{background:rgba(255,255,255,.045);border:1px solid var(--line);border-radius:20px;padding:16px 18px;transition:background .25s,transform .25s;min-width:0}
.ke-glass:hover{background:rgba(255,255,255,.075);transform:translateY(-2px)}
.ke-glass-l{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(242,241,236,.6);margin:0}
.ke-glass-v{font-family:var(--display);font-weight:700;font-size:34px;line-height:1;margin:10px 0 0;white-space:nowrap;color:#fff}
.ke-glass-v small{font-size:.42em;margin-left:6px;color:rgba(242,241,236,.55);letter-spacing:.05em}
.ke-dtrack{height:6px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin:12px 0 8px}
.ke-dtrack i{display:block;height:100%;width:0;border-radius:999px;transition:width 1.2s cubic-bezier(.22,1,.36,1)}
.ke-glass-s{font-size:12px;color:rgba(242,241,236,.55);font-weight:600;margin:0}
.ke-hero-side{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding-left:30px;border-left:1px solid var(--line);min-width:230px}
.ke-ring-wrap{position:relative;display:grid;place-items:center}
.ke-ring-wrap svg{transform:rotate(-90deg)}
.ke-ring-wrap circle{transition:stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)}
.ke-ring-c{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--display);font-weight:800;color:#fff}
.ke-ring-c small{font-size:.45em;color:rgba(242,241,236,.6)}
.ke-side-l{margin:14px 0 0}
.ke-side-v{font-family:var(--display);font-weight:800;font-size:30px;line-height:1;margin:6px 0 0;color:#fff}
.ke-side-v span{color:rgba(242,241,236,.45)}
.ke-side-s{font-size:12.5px;font-weight:600;color:rgba(242,241,236,.6);margin:4px 0 0}

/* bouton */
.ke-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid transparent;border-radius:14px;padding:11px 18px;height:46px;font:700 13.5px var(--body);cursor:pointer;white-space:nowrap;text-decoration:none;transition:transform .2s cubic-bezier(.22,1,.36,1),background .2s,color .2s,box-shadow .2s,border-color .2s}
.ke-btn:hover:not(:disabled){transform:translateY(-2px)}
.ke-btn:active:not(:disabled){transform:scale(.97)}
.ke-btn:disabled{opacity:.5;cursor:not-allowed}
.ke-btn:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.ke-btn-gold{background:var(--gold);color:var(--night);box-shadow:0 10px 24px -10px rgba(255,200,61,.75)}
.ke-btn-gold:hover:not(:disabled){box-shadow:0 14px 30px -10px rgba(255,200,61,.9)}
.ke-btn-glass{background:rgba(255,255,255,.06);color:#f2f1ec;border-color:rgba(255,255,255,.12)}
.ke-btn-glass:hover:not(:disabled){background:rgba(255,255,255,.12)}
.ke-btn-glass.on{color:#4ade80;border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.1)}
.ke-btn-glass.sq{width:46px;padding:0}
.ke-btn-dark{background:var(--night);color:#f2f1ec}
.ke-btn-dark:hover:not(:disabled){background:var(--gold);color:var(--night)}
.ke-btn-soft{background:var(--card);color:var(--ink);border-color:var(--border)}
.ke-btn-soft:hover:not(:disabled){border-color:rgba(20,21,26,.2);box-shadow:0 10px 22px -14px rgba(20,21,26,.35)}
.ke-btn .lbl{display:inline}
@media(max-width:760px){.ke-btn-glass .lbl{display:none}.ke-btn-glass{width:46px;padding:0}}
.ke-hide-sm{}
@media(max-width:639px){.ke-hide-sm{display:none!important}}

/* ── Stat kat blan ── */
.ke-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.ke-stat{position:relative;overflow:hidden;background:var(--card);border:1px solid var(--border);border-radius:24px;padding:22px;box-shadow:0 1px 2px rgba(20,21,26,.03);transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s;animation:keIn .6s cubic-bezier(.22,1,.36,1) backwards}
.ke-stat:hover{transform:translateY(-4px);box-shadow:0 22px 40px -22px rgba(20,21,26,.3)}
.ke-stat::before{content:'';position:absolute;width:170px;height:170px;border-radius:50%;right:-50px;top:-80px;background:var(--cbg);transition:transform .5s cubic-bezier(.22,1,.36,1)}
.ke-stat:hover::before{transform:scale(1.12)}
.ke-stat>*{position:relative}
.ke-stat-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;min-height:44px}
.ke-stat-ic{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;color:var(--c);background:var(--cbg)}
.ke-pill{font-size:12px;font-weight:800;color:var(--c);background:var(--cbg2);padding:6px 11px;border-radius:999px;white-space:nowrap}
.ke-stat-v{font-family:var(--display);font-weight:800;font-size:50px;line-height:.9;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-stat-v small{font-size:.4em;color:var(--muted);margin-left:5px;letter-spacing:.05em}
.ke-stat-l{font-size:14px;font-weight:600;color:var(--muted);margin:8px 0 16px}
.ke-track{height:6px;border-radius:999px;background:rgba(20,21,26,.07);overflow:hidden}
.ke-track i{display:block;height:100%;width:0;border-radius:999px;background:var(--c);transition:width 1.2s cubic-bezier(.22,1,.36,1)}

/* ── Seksyon + toolbar ── */
.ke-section-head{display:flex;align-items:center;gap:12px;margin:8px 0 -4px}
.ke-section-head h2{margin:0;font-family:var(--display);font-weight:800;font-size:24px;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.ke-count{font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;background:var(--night);color:var(--gold)}
.ke-rule{flex:1;height:1px;background:var(--border)}
.ke-updating{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--muted)}
.ke-toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.ke-search{position:relative;flex:1 1 320px;min-width:0}
.ke-search .lead{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;transition:color .2s}
.ke-search input{width:100%;height:54px;padding:0 48px 0 50px;border-radius:18px;border:1.5px solid var(--border);background:var(--card);color:var(--ink);font:600 15px var(--body);outline:none;transition:border-color .2s,box-shadow .2s}
.ke-search input::placeholder{color:#9a9eaa;font-weight:500}
.ke-search input:focus{border-color:var(--night);box-shadow:0 0 0 4px rgba(255,200,61,.5)}
.ke-search:focus-within .lead{color:var(--ink)}
.ke-search .clr{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:30px;height:30px;border-radius:10px;border:none;background:var(--soft);color:var(--muted);display:grid;place-items:center;cursor:pointer}
.ke-search .clr:hover{background:var(--night);color:var(--gold)}
.ke-tabs{position:relative;display:grid;grid-template-columns:repeat(3,1fr);padding:5px;background:var(--card);border:1px solid var(--border);border-radius:18px;flex:0 0 auto}
.ke-tabs-pill{position:absolute;top:5px;bottom:5px;left:5px;width:calc((100% - 10px)/3);border-radius:13px;background:var(--night);transition:transform .35s cubic-bezier(.3,1.25,.5,1)}
.ke-tabs button{position:relative;z-index:1;border:0;background:transparent;height:42px;padding:0 16px;min-width:92px;border-radius:13px;font:700 13px var(--body);color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:color .25s}
.ke-tabs button.on{color:#f2f1ec}
.ke-tabs button .n{font-size:10.5px;padding:1px 7px;border-radius:999px;background:rgba(20,21,26,.07)}
.ke-tabs button.on .n{background:var(--gold);color:var(--night)}
@media(max-width:639px){.ke-tabs{flex:1 1 100%}.ke-tabs button{min-width:0;padding:0 8px}}

/* ── Kat kont ── */
.ke-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;scroll-margin-top:90px}
@media(max-width:400px){.ke-grid{grid-template-columns:1fr}}
.ke-acc{position:relative;overflow:hidden;background:var(--card);border:1px solid var(--border);border-radius:24px;padding:18px;cursor:pointer;display:flex;flex-direction:column;gap:16px;outline:none;animation:keIn .55s cubic-bezier(.22,1,.36,1) backwards;transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,border-color .3s}
.ke-acc::before{content:'';position:absolute;width:150px;height:150px;border-radius:50%;right:-50px;top:-70px;background:var(--abg);transition:transform .5s cubic-bezier(.22,1,.36,1)}
.ke-acc:hover,.ke-acc:focus-visible{transform:translateY(-4px);box-shadow:0 22px 40px -22px rgba(20,21,26,.32);border-color:rgba(20,21,26,.14)}
.ke-acc:hover::before{transform:scale(1.15)}
.ke-acc>*{position:relative}
.ke-acc.off{opacity:.62}
.ke-acc-head{display:flex;gap:12px;align-items:center;min-width:0}
.ke-av{display:grid;place-items:center;flex:none;font-family:var(--display);font-weight:800;color:#fff;letter-spacing:.03em;background:linear-gradient(135deg,var(--a1),var(--a2));overflow:hidden;box-shadow:0 8px 18px -10px var(--a2)}
.ke-av img{width:100%;height:100%;object-fit:cover}
.ke-acc-id{min-width:0;flex:1}
.ke-acc-no{margin:0;font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.08em;color:var(--gold-ink)}
.ke-acc-name{margin:1px 0 0;font-weight:800;font-size:15.5px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.ke-acc-meta{margin:3px 0 0;font-size:12.5px;color:var(--muted);display:flex;align-items:center;gap:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.03em;white-space:nowrap;color:var(--c);background:var(--cbg)}
.ke-chip.dark{background:var(--night);color:var(--gold)}
.ke-badges{display:flex;flex-direction:column;gap:5px;align-items:flex-end;align-self:flex-start;flex:none}
.ke-acc-bal{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:14px 16px;border-radius:18px;background:var(--soft)}
.ke-label-s{margin:0;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.ke-acc-bal .v{margin:6px 0 0;font-family:var(--display);font-weight:800;font-size:38px;line-height:.9;white-space:nowrap;color:var(--ink)}
.ke-acc-bal .v small{font-size:.38em;color:var(--muted);margin-left:5px;letter-spacing:.06em}
.ke-acts{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}
.ke-acts.adm{grid-template-columns:1fr 1fr auto auto}
.ke-act{height:42px;border-radius:13px;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;gap:6px;font:800 13px var(--body);cursor:pointer;padding:0 12px;transition:background .2s,color .2s,transform .15s,box-shadow .2s,border-color .2s}
.ke-act:active:not(:disabled){transform:scale(.96)}
.ke-act.dep{color:var(--green);background:rgba(22,163,74,.09)}
.ke-act.dep:hover:not(:disabled){background:var(--green);color:#fff;box-shadow:0 10px 20px -10px var(--green)}
.ke-act.ret{color:var(--red);background:rgba(220,38,38,.08)}
.ke-act.ret:hover:not(:disabled){background:var(--red);color:#fff;box-shadow:0 10px 20px -10px var(--red)}
.ke-act.ic{width:42px;padding:0;color:var(--muted);background:var(--card);border-color:var(--border)}
.ke-act.ic:hover:not(:disabled){background:var(--night);color:var(--gold);border-color:var(--night)}
.ke-act.ic.danger:hover:not(:disabled){background:var(--red);color:#fff;border-color:var(--red)}
.ke-act.ic.goldy{color:var(--gold-ink);border-color:rgba(224,164,16,.35);background:rgba(255,200,61,.12)}
.ke-act:disabled{opacity:.45;cursor:not-allowed}

/* skeleton + vid + pajinasyon */
.ke-skel{border-radius:10px;background:linear-gradient(90deg,rgba(20,21,26,.05) 0,rgba(20,21,26,.11) 50%,rgba(20,21,26,.05) 100%);background-size:800px 100%;animation:keShimmer 1.3s linear infinite}
.ke-empty{text-align:center;padding:50px 20px;background:var(--card);border:1.5px dashed rgba(20,21,26,.14);border-radius:24px;color:var(--muted);font-weight:600}
.ke-empty-ic{width:62px;height:62px;margin:0 auto 14px;border-radius:19px;background:var(--night);display:grid;place-items:center;color:var(--gold)}
.ke-empty h3{margin:0;font-family:var(--display);font-weight:800;font-size:24px;text-transform:uppercase;color:var(--ink);letter-spacing:.03em}
.ke-empty p{margin:6px 0 18px}
.ke-pager{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 8px 8px 18px;border-radius:18px;background:var(--card);border:1px solid var(--border);font-size:13px;font-weight:600;color:var(--muted)}
.ke-pages{display:flex;gap:6px;align-items:center}
.ke-pnums{display:none;gap:6px}
@media(min-width:480px){.ke-pnums{display:flex}.ke-pcur{display:none}}
.ke-pcur{font-family:var(--display);font-weight:800;font-size:18px;color:var(--ink);min-width:52px;text-align:center}
.ke-pg{min-width:40px;height:40px;padding:0 8px;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--ink);font:800 17px var(--display);cursor:pointer;display:grid;place-items:center;transition:all .2s}
.ke-pg:hover:not(:disabled):not(.on){background:var(--soft)}
.ke-pg.on{background:var(--night);color:var(--gold);border-color:var(--night)}
.ke-pg:disabled{opacity:.35;cursor:default}
.ke-pg.dots{border:none;background:none;cursor:default;min-width:18px}
.ke-fab{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:60;height:58px;padding:0 22px;border-radius:20px;border:none;background:var(--night);color:var(--gold);font:800 15px var(--body);display:inline-flex;align-items:center;gap:9px;cursor:pointer;box-shadow:0 18px 36px -12px rgba(11,12,15,.7);animation:kePop .5s .4s cubic-bezier(.22,1,.36,1) backwards}
.ke-fab:active{transform:scale(.96)}
@media(min-width:640px){.ke-fab{display:none}}

/* ── Modal ── */
.ke-ov{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(11,12,15,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:keFade .2s ease both}
.ke-ov.closing{animation:keFadeOut .2s ease both}
.ke-sheet{position:relative;width:100%;max-width:var(--w,540px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;background:var(--card);border-radius:26px;box-shadow:0 40px 80px -30px rgba(11,12,15,.6);color:var(--ink);animation:kePop .38s cubic-bezier(.22,1,.36,1)}
.ke-ov.closing .ke-sheet{animation:keOut .2s ease-in both}
.ke-grab{display:none;width:42px;height:4px;border-radius:99px;background:rgba(20,21,26,.15);margin:10px auto 0;flex:none}
@media(max-width:639px){
  .ke-ov{align-items:flex-end;padding:0}
  .ke-sheet{border-radius:26px 26px 0 0;max-height:94vh;max-height:94dvh;animation:keUp .4s cubic-bezier(.22,1,.36,1)}
  .ke-ov.closing .ke-sheet{animation:keDown .22s ease-in both}
  .ke-grab{display:block}
}
.ke-mhead{display:flex;align-items:center;gap:12px;padding:18px 22px 16px;border-bottom:1px solid var(--border);flex:none}
.ke-mhead-ic{width:44px;height:44px;flex:none;border-radius:14px;background:var(--night);color:var(--accent,var(--gold));display:grid;place-items:center}
.ke-mtitle{margin:0;font-family:var(--display);font-weight:800;font-size:25px;line-height:1;text-transform:uppercase;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-msub{margin:4px 0 0;font-size:12.5px;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-x{margin-left:auto;width:38px;height:38px;flex:none;border-radius:12px;border:1px solid var(--border);background:var(--card);color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:all .25s}
.ke-x:hover{background:var(--night);color:var(--gold);border-color:var(--night);transform:rotate(90deg)}
.ke-mbody{flex:1;overflow-y:auto;padding:18px 22px 22px;overscroll-behavior:contain}
.ke-mfoot{display:flex;gap:10px;padding:14px 22px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--border);background:#fbfaf7;flex:none}
.ke-col{display:flex;flex-direction:column;gap:14px}

/* fòm */
.ke-sec{border:1px solid var(--border);border-radius:20px;padding:16px;margin-bottom:14px;animation:keIn .5s cubic-bezier(.22,1,.36,1) backwards}
.ke-sec-h{display:flex;align-items:center;gap:10px;margin:0 0 14px}
.ke-sec-n{width:28px;height:28px;border-radius:9px;background:var(--night);color:var(--gold);font:800 15px var(--display);display:grid;place-items:center;flex:none}
.ke-sec-t{margin:0;font-family:var(--display);font-weight:800;font-size:18px;letter-spacing:.05em;text-transform:uppercase}
.ke-sec-opt{margin-left:auto;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:var(--soft);padding:3px 9px;border-radius:999px}
.ke-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ke-two-r{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:439px){.ke-two-r{grid-template-columns:1fr}}
.ke-three{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ke-mt{margin-top:12px}
.ke-label{display:block;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.ke-input{width:100%;height:48px;padding:0 14px;border-radius:13px;border:1.5px solid var(--border);background:var(--soft);color:var(--ink);font:600 14.5px var(--body);outline:none;transition:border-color .2s,box-shadow .2s,background .2s}
textarea.ke-input{height:auto;min-height:76px;padding:12px 14px;resize:vertical;line-height:1.45}
select.ke-input{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:40px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7080' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
.ke-input:focus{background:var(--card);border-color:var(--night);box-shadow:0 0 0 4px rgba(255,200,61,.5)}
.ke-input.err{border-color:var(--red);box-shadow:0 0 0 4px rgba(220,38,38,.12)}
.ke-input::placeholder{color:#9a9eaa;font-weight:500}
.ke-err{margin:6px 0 0;font-size:12px;color:var(--red);font-weight:700;display:flex;align-items:center;gap:5px;animation:keShake .35s}
.ke-hint{margin:8px 0 0;font-size:12px;color:var(--muted);font-weight:600}
@media(max-width:639px){.ke-input,.ke-search input{font-size:16px}}

.ke-numchip{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-radius:20px;margin-bottom:14px;background:var(--night);color:#f2f1ec;position:relative;overflow:hidden}
.ke-numchip::before{content:'';position:absolute;right:-60px;top:-90px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.25),rgba(255,200,61,0) 65%)}
.ke-numchip>*{position:relative}
.ke-numchip .v{margin:5px 0 0;font-family:var(--display);font-weight:800;font-size:30px;line-height:1;color:var(--gold);letter-spacing:.05em}

.ke-photo{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:124px;border-radius:18px;cursor:pointer;overflow:hidden;border:1.5px dashed rgba(20,21,26,.18);background:var(--soft);color:var(--muted);transition:all .2s;text-align:center;padding:0 10px;font-size:12px;font-weight:700}
.ke-photo:hover{border-color:var(--night);color:var(--ink);background:#fff}
.ke-photo.has{border:none;padding:0}
.ke-photo img{width:100%;height:100%;object-fit:cover;animation:keFade .3s}
.ke-photo .ic{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:var(--night);color:var(--gold)}
.ke-photo .ok{position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:50%;background:var(--gold);color:var(--night);display:grid;place-items:center;animation:kePop .3s}

/* montan (bwat nwa) */
.ke-amount{position:relative;overflow:hidden;border-radius:22px;padding:18px 16px 16px;text-align:center;background:var(--night);color:#f2f1ec;transition:box-shadow .2s}
.ke-amount::before{content:'';position:absolute;left:50%;top:-140px;width:320px;height:240px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,var(--glow),transparent 65%);pointer-events:none}
.ke-amount>*{position:relative}
.ke-amount:focus-within{box-shadow:0 0 0 4px var(--ring)}
.ke-amount.err{animation:keShake .35s;box-shadow:0 0 0 3px rgba(220,38,38,.5)}
.ke-amount-l{margin:0;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--acc)}
.ke-amount input{width:100%;background:transparent;border:none;outline:none;text-align:center;font-family:var(--display);font-weight:800;font-size:64px;line-height:1;color:#fff;padding:8px 0 0;caret-color:var(--acc)}
.ke-amount input::placeholder{color:rgba(242,241,236,.2)}
.ke-amount-cur{font-size:11px;font-weight:800;letter-spacing:.16em;color:rgba(242,241,236,.5)}
.ke-quick{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:14px}
.ke-quick button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);border-radius:11px;padding:7px 12px;font:800 13px var(--body);color:#f2f1ec;cursor:pointer;transition:all .18s}
.ke-quick button:hover{background:var(--acc);color:var(--night);border-color:var(--acc)}
.ke-quick button.all{border-color:var(--acc);color:var(--acc)}
@media(max-width:439px){.ke-amount input{font-size:54px}}

/* metòd */
.ke-methods{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ke-m{height:62px;border-radius:15px;border:1.5px solid var(--border);background:var(--card);color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font:800 12px var(--body);cursor:pointer;transition:all .2s}
.ke-m:hover{color:var(--ink);border-color:rgba(20,21,26,.2)}
.ke-m.on{background:var(--night);color:var(--gold);border-color:var(--night);box-shadow:0 10px 20px -12px rgba(11,12,15,.6)}

/* rezime */
.ke-summary{background:var(--soft);border-radius:18px;padding:14px 16px;margin-top:12px;animation:keIn .35s backwards}
.ke-summary .line{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13.5px;font-weight:600;padding:4px 0}
.ke-summary .line span:first-child{color:var(--muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ke-summary .line b{font-weight:800;white-space:nowrap}
.ke-summary .total{display:flex;justify-content:space-between;align-items:baseline;gap:10px;border-top:1px dashed rgba(20,21,26,.18);margin-top:8px;padding-top:12px}
.ke-summary .total span:first-child{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
.ke-summary .total b{font-family:var(--display);font-weight:800;font-size:32px;line-height:1;white-space:nowrap}
.ke-tag{font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 7px;border-radius:6px;color:var(--red);background:rgba(220,38,38,.1)}
.ke-stack{height:8px;border-radius:99px;background:rgba(20,21,26,.07);display:flex;overflow:hidden;gap:2px;margin-top:14px}
.ke-stack i{display:block;height:100%;transition:width .55s cubic-bezier(.22,1,.36,1)}
.ke-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:9px;font-size:12px;font-weight:700}
.ke-legend span{display:inline-flex;align-items:center;gap:6px}
.ke-legend span::before{content:'';width:8px;height:8px;border-radius:3px;background:currentColor}

.ke-alert{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:15px;font-size:13px;line-height:1.5;font-weight:600;color:var(--ink);background:var(--cbg);border:1px solid var(--cbd);animation:keIn .35s backwards}
.ke-alert svg{color:var(--c);flex:none;margin-top:1px}

/* bouton footer */
.ke-fbtn{flex:1;height:52px;border-radius:15px;border:1px solid var(--border);background:var(--card);color:var(--ink);font:700 14px var(--body);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .2s}
.ke-fbtn:hover:not(:disabled){border-color:rgba(20,21,26,.22);box-shadow:0 10px 22px -14px rgba(20,21,26,.35)}
.ke-fbtn.main{flex:2;border:none;font-weight:800;font-size:14.5px}
.ke-fbtn.main:hover:not(:disabled){transform:translateY(-2px)}
.ke-fbtn.main:active:not(:disabled){transform:scale(.98)}
.ke-fbtn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
.ke-fbtn.gold{background:var(--gold);color:var(--night);box-shadow:0 12px 26px -12px rgba(224,164,16,.8)}
.ke-fbtn.dark{background:var(--night);color:var(--gold)}
.ke-fbtn.green{background:var(--green);color:#fff;box-shadow:0 12px 26px -12px rgba(22,163,74,.8)}
.ke-fbtn.red{background:var(--red);color:#fff;box-shadow:0 12px 26px -12px rgba(220,38,38,.8)}
.ke-fbtn.orange{background:var(--orange);color:#fff;box-shadow:0 12px 26px -12px rgba(217,119,6,.8)}
.ke-fbtn.danger{background:#b91c1c;color:#fff}

/* modal tx */
.ke-mini{display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:var(--soft)}
.ke-mini .r{margin-left:auto;text-align:right;flex:none}
.ke-mini .r .v{margin:4px 0 0;font-family:var(--display);font-weight:800;font-size:26px;line-height:1;color:var(--ink)}
.ke-preview{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;padding:14px 16px;border-radius:18px;border:1.5px solid var(--cbd);background:var(--cbg);animation:kePop .3s backwards}
.ke-preview .v{margin:5px 0 0;font-family:var(--display);font-weight:800;font-size:26px;line-height:1;white-space:nowrap}
.ke-preview .arrow{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--night);color:var(--gold)}

/* detay — kanè nwa */
.ke-pass{position:relative;overflow:hidden;border-radius:24px;padding:22px;background:var(--night);color:#f2f1ec;box-shadow:0 24px 44px -24px rgba(11,12,15,.7);animation:kePop .5s cubic-bezier(.22,1,.36,1) backwards}
.ke-pass::before{content:'';position:absolute;right:-80px;top:-140px;width:340px;height:340px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.26),rgba(255,200,61,0) 65%);animation:keGlow 9s ease-in-out infinite}
.ke-pass::after{content:'';position:absolute;inset:0;opacity:.5;background-image:radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px);background-size:20px 20px;-webkit-mask-image:linear-gradient(90deg,transparent 40%,#000);mask-image:linear-gradient(90deg,transparent 40%,#000)}
.ke-pass>*{position:relative;z-index:1}
.ke-pass-top{display:flex;gap:14px;align-items:center;min-width:0}
.ke-pass-ph{width:58px;height:58px;border-radius:18px;overflow:hidden;flex:none;display:grid;place-items:center;font:800 24px var(--display);background:var(--gold);color:var(--night);border:none;padding:0}
.ke-pass-ph img{width:100%;height:100%;object-fit:cover}
.ke-pass-name{margin:0;font-family:var(--display);font-weight:800;font-size:28px;line-height:.95;text-transform:uppercase;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff}
.ke-pass-no{margin:5px 0 0;font-family:var(--display);font-weight:700;font-size:16px;letter-spacing:.08em;color:var(--gold)}
.ke-pass-chip{margin-left:auto;width:42px;height:32px;flex:none;border-radius:8px;background:linear-gradient(135deg,#FFE7A3,#C8930E);position:relative}
.ke-pass-chip::before{content:'';position:absolute;inset:7px 9px;border:1px solid rgba(11,12,15,.35);border-radius:3px}
.ke-pass-bal{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:24px}
.ke-pass-bal .v{margin:8px 0 0;font-family:var(--display);font-weight:800;font-size:62px;line-height:.85;color:var(--gold);white-space:nowrap}
.ke-pass-bal .v small{font-size:.35em;color:rgba(242,241,236,.55);margin-left:8px;letter-spacing:.05em}
.ke-pass-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.ke-pass-meta span{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid var(--line);color:rgba(242,241,236,.85)}
@media(max-width:439px){.ke-pass-bal .v{font-size:50px}.ke-pass-name{font-size:24px}}

.ke-mtile{border-radius:18px;padding:14px;background:var(--cbg);min-width:0;animation:keIn .45s backwards}
.ke-mtile .v{margin:7px 0 0;font-family:var(--display);font-weight:800;font-size:26px;line-height:1;color:var(--c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-info{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-info>div{padding:12px 14px;border-radius:16px;border:1px solid var(--border);min-width:0}
.ke-info .v{margin:5px 0 0;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-kyc{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-kyc button{position:relative;height:120px;border-radius:18px;overflow:hidden;border:none;padding:0;cursor:zoom-in;background:var(--soft)}
.ke-kyc img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.ke-kyc button:hover img{transform:scale(1.06)}
.ke-kyc span{position:absolute;left:8px;bottom:8px;font-size:11px;font-weight:800;padding:5px 9px;border-radius:9px;background:var(--night);color:var(--gold)}
.ke-detail-acts{display:grid;grid-template-columns:1fr 1fr auto auto;gap:8px}
.ke-detail-acts .ke-act{height:50px;font-size:14px;border-radius:15px}
.ke-detail-acts .ke-act.ic{width:50px}

.ke-tl{display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;padding-right:2px}
.ke-tx{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:17px;border:1px solid var(--border);background:var(--card);animation:keIn .4s backwards;transition:transform .2s,box-shadow .2s}
.ke-tx:hover{transform:translateX(3px);box-shadow:0 12px 24px -16px rgba(20,21,26,.3)}
.ke-tx-ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;color:var(--c);background:var(--cbg);flex:none}
.ke-tx-mid{flex:1;min-width:0}
.ke-tx-t{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-weight:800;font-size:14px}
.ke-tx-amt{font-family:var(--display);font-weight:800;font-size:21px;line-height:1;color:var(--c);white-space:nowrap}
.ke-tx-s{margin:3px 0 0;font-size:12px;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-ibtn{width:34px;height:34px;flex:none;border-radius:11px;border:1px solid var(--border);background:var(--card);color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:all .2s;padding:0}
.ke-ibtn:hover:not(:disabled){background:var(--night);color:var(--gold);border-color:var(--night)}
.ke-ibtn.danger:hover:not(:disabled){background:var(--red);color:#fff;border-color:var(--red)}
.ke-ibtn.goldy{color:var(--gold-ink);background:rgba(255,200,61,.14);border-color:rgba(224,164,16,.3)}
.ke-ibtn:disabled{opacity:.5;cursor:wait}
.ke-sh{display:flex;align-items:center;gap:10px;margin:2px 0 10px}
.ke-sh h3{margin:0;font-family:var(--display);font-weight:800;font-size:19px;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.ke-danger{border-radius:20px;padding:16px;background:rgba(220,38,38,.05);border:1px solid rgba(220,38,38,.18)}
.ke-danger p{margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--red);display:flex;align-items:center;gap:6px}
.ke-danger button{width:100%;height:48px;border-radius:14px;border:1px solid rgba(220,38,38,.3);background:var(--card);color:var(--red);font:800 13.5px var(--body);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s}
.ke-danger button:hover:not(:disabled){background:var(--red);color:#fff;border-color:var(--red)}

.ke-lb{position:fixed;inset:0;z-index:1200;background:rgba(11,12,15,.92);display:grid;place-items:center;padding:20px;animation:keFade .2s;cursor:zoom-out}
.ke-lb img{max-width:100%;max-height:84vh;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.6);animation:kePop .3s}
.ke-lb p{position:absolute;bottom:calc(20px + env(safe-area-inset-bottom,0px));left:0;right:0;text-align:center;color:var(--gold);margin:0;font:800 18px var(--display);letter-spacing:.08em;text-transform:uppercase}

/* resi pataje */
.ke-rcpt-wrap{border-radius:20px;background:#ECE8DF;overflow:hidden;position:relative}
.ke-rcpt-inner{transform-origin:top left}
.ke-rcpt-note{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--muted);margin:12px 2px 0}

/* fèmen kès */
.ke-steps{display:flex;align-items:center;gap:10px;margin:0 0 16px}
.ke-step{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:var(--muted);white-space:nowrap}
.ke-step b{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:1.5px solid var(--border);font:800 15px var(--display);transition:all .3s}
.ke-step.on{color:var(--ink)}
.ke-step.on b{background:var(--night);color:var(--gold);border-color:var(--night)}
.ke-step.done{color:var(--green)}
.ke-step.done b{background:rgba(22,163,74,.1);color:var(--green);border-color:rgba(22,163,74,.35)}
.ke-step-line{flex:1;height:4px;min-width:20px;background:rgba(20,21,26,.07);border-radius:4px;overflow:hidden}
.ke-step-line i{display:block;height:100%;background:var(--gold);transition:width .5s cubic-bezier(.22,1,.36,1)}
.ke-diff{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 18px;border-radius:18px;color:var(--night);background:var(--c);animation:kePop .3s cubic-bezier(.22,1,.36,1) backwards}
.ke-diff .k{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.ke-diff .s{margin:3px 0 0;font-size:12.5px;font-weight:700;opacity:.85}
.ke-diff .v{font-family:var(--display);font-weight:800;font-size:32px;line-height:1;white-space:nowrap}
.ke-success{text-align:center;padding:12px 0 4px}
.ke-check{width:96px;height:96px;margin:4px auto 16px;border-radius:50%;background:var(--night);display:grid;place-items:center;animation:kePop .5s backwards;box-shadow:0 0 0 10px rgba(255,200,61,.15)}
.ke-check path{stroke-dasharray:50;stroke-dashoffset:50;animation:keDraw .6s .3s ease forwards}
.ke-success h3{margin:0;font-family:var(--display);font-weight:800;font-size:34px;text-transform:uppercase;letter-spacing:.02em}
.ke-success p{margin:6px 0 0;font-size:13.5px;color:var(--muted);font-weight:600}

/* ── Responsive hero/stats ── */
@media(max-width:1000px){
  .ke-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .ke-hero-body{grid-template-columns:1fr}
  .ke-hero-side{flex-direction:row;justify-content:flex-start;gap:20px;padding:20px 0 0;border-left:0;border-top:1px solid var(--line);min-width:0}
  .ke-hero-side .ke-side-txt{text-align:left}
  .ke-side-l{margin:0}
}
@media(max-width:820px){
  .ke-hero{padding:22px 20px;border-radius:24px}
  .ke-title{font-size:36px}
  .ke-hero-bottom{grid-template-columns:1fr 1fr}
  .ke-hero-bottom>:first-child{grid-column:1/-1}
  .ke-big{font-size:72px}
}
@media(max-width:520px){
  .ke-logo{width:48px;height:48px;border-radius:15px}
  .ke-title{font-size:32px}
  .ke-big{font-size:58px}
  .ke-big small{font-size:20px}
  .ke-glass{padding:14px}
  .ke-glass-v{font-size:26px}
  .ke-stats{gap:12px}
  .ke-stat{padding:16px;border-radius:20px}
  .ke-stat-top{margin-bottom:14px}
  .ke-stat-ic{width:40px;height:40px;border-radius:13px}
  .ke-stat-v{font-size:38px}
  .ke-stat-l{font-size:12.5px;margin:6px 0 12px}
  .ke-pill{font-size:11px;padding:4px 8px}
  .ke-mhead{padding:14px 18px 14px}
  .ke-mbody{padding:16px 18px 20px}
  .ke-mfoot{padding:12px 18px calc(12px + env(safe-area-inset-bottom,0px))}
  .ke-mtitle{font-size:22px}
}
@media (prefers-reduced-motion:reduce){
  .ke-scope *,.ke-scope *::before,.ke-scope *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
}
`