// src/pages/enterprise/kane-epay/kaneEpayConstants.js
// ═══════════════════════════════════════════════════════════════
// KANÈ EPAY — Konstan + Design System (koulè, tipografi, animasyon)
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

// Frè ouverture otomatik (HTG)
export const FRE_OUVERTURE = 250

// Bouton montan rapid nan modal yo
export const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000]

// ─── Token koulè (menm valè ak CSS la anba) ──────────────────
export const T = {
  bg0: '#060C18', bg1: '#0B1528', bg2: '#0F1C34', bg3: '#152542',
  text: '#EEF2F8', muted: '#8B98B0', dim: '#5D6B85',
  gold: '#D4AF37', gold2: '#F3D27A', gold3: '#A57D1C',
  green: '#2BD18B', red: '#FF5D6E', orange: '#F6A623', blue: '#5E9CFF', violet: '#A78BFA',
}

export const TX_STYLES = {
  ouverture: { color: T.gold,  bg: 'rgba(212,175,55,0.10)', label: 'Ouverture', icon: '🏦' },
  depot:     { color: T.green, bg: 'rgba(43,209,139,0.10)', label: 'Depo',      icon: '↓'  },
  retrait:   { color: T.red,   bg: 'rgba(255,93,110,0.10)', label: 'Retrè',     icon: '↑'  },
}

// Pè gradyan pou avatar yo (chwazi selon non kliyan an)
export const AVATAR_GRADIENTS = [
  ['#D4AF37', '#8C6A12'], ['#5E9CFF', '#2B5BC4'], ['#2BD18B', '#138A57'],
  ['#A78BFA', '#6D4BD8'], ['#F6A623', '#B86E06'], ['#FF7A8A', '#C23A50'],
  ['#38C6E0', '#1679A0'], ['#E58BD5', '#A1418F'],
]

// ═══════════════════════════════════════════════════════════════
// CSS — tout stil modil la (responsive + animasyon)
// ═══════════════════════════════════════════════════════════════
export const KANE_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap');

/* ── Token ─────────────────────────────────────────────── */
.ke-scope{
  --ke-bg0:#060C18; --ke-bg1:#0B1528; --ke-bg2:#0F1C34; --ke-bg3:#152542;
  --ke-line:rgba(212,175,55,.18); --ke-line2:rgba(255,255,255,.07);
  --ke-text:#EEF2F8; --ke-muted:#8B98B0; --ke-dim:#5D6B85;
  --ke-gold:#D4AF37; --ke-gold2:#F3D27A; --ke-gold3:#A57D1C;
  --ke-green:#2BD18B; --ke-red:#FF5D6E; --ke-orange:#F6A623; --ke-blue:#5E9CFF; --ke-violet:#A78BFA;
  --ke-grad-gold:linear-gradient(135deg,#F7E09A 0%,#D4AF37 48%,#A57D1C 100%);
  --ke-shadow:0 12px 32px -14px rgba(2,6,18,.6),0 2px 6px rgba(2,6,18,.22);
  --ke-font:'Plus Jakarta Sans','DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
  --ke-mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  font-family:var(--ke-font);
  -webkit-font-smoothing:antialiased;
  -webkit-tap-highlight-color:transparent;
}
.ke-scope *,.ke-scope *::before,.ke-scope *::after{box-sizing:border-box}
.ke-scope button{font-family:inherit}
.ke-num{font-family:var(--ke-mono);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.ke-scope input[type=number]::-webkit-inner-spin-button,
.ke-scope input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.ke-scope input[type=number]{-moz-appearance:textfield}
.ke-scope ::-webkit-scrollbar{width:6px;height:6px}
.ke-scope ::-webkit-scrollbar-thumb{background:rgba(212,175,55,.28);border-radius:6px}
.ke-scope ::-webkit-scrollbar-track{background:transparent}

/* ── Animasyon ─────────────────────────────────────────── */
@keyframes ke-spin{to{transform:rotate(360deg)}}
@keyframes ke-fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes ke-fadeIn{from{opacity:0}to{opacity:1}}
@keyframes ke-fadeOut{to{opacity:0}}
@keyframes ke-sheetUp{from{transform:translateY(100%)}to{transform:none}}
@keyframes ke-sheetDown{to{transform:translateY(100%)}}
@keyframes ke-pop{from{opacity:0;transform:scale(.94) translateY(12px)}to{opacity:1;transform:none}}
@keyframes ke-popOut{to{opacity:0;transform:scale(.96) translateY(8px)}}
@keyframes ke-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
@keyframes ke-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-24px,18px) scale(1.08)}}
@keyframes ke-ping{0%{box-shadow:0 0 0 0 rgba(43,209,139,.6)}80%,100%{box-shadow:0 0 0 9px rgba(43,209,139,0)}}
@keyframes ke-pingRed{0%{box-shadow:0 0 0 0 rgba(255,93,110,.6)}80%,100%{box-shadow:0 0 0 9px rgba(255,93,110,0)}}
@keyframes ke-pulse{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes ke-sweep{0%{left:-60%}55%,100%{left:130%}}
@keyframes ke-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes ke-draw{to{stroke-dashoffset:0}}
@keyframes ke-shake{0%,100%{transform:none}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@keyframes ke-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.ke-spin{animation:ke-spin .8s linear infinite}
.ke-spinner{display:inline-block;flex-shrink:0;border-radius:50%;border:2px solid currentColor;border-top-color:transparent!important;animation:ke-spin .75s linear infinite;opacity:.9}

/* ── Paj ───────────────────────────────────────────────── */
.ke-page{max-width:1140px;margin:0 auto;padding:12px 10px 112px;display:flex;flex-direction:column;gap:14px;color:var(--ke-text)}
@media(min-width:640px){.ke-page{padding:18px 18px 64px;gap:16px}}
@media(min-width:1024px){.ke-page{padding:22px 24px 64px;gap:18px}}

/* Bannè kès fèmen */
.ke-lockbar{display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:16px;background:linear-gradient(100deg,#3A0F1A 0%,#22101A 60%,#160D18 100%);border:1px solid rgba(255,93,110,.4);color:#FFC5CB;box-shadow:var(--ke-shadow);animation:ke-fadeUp .45s backwards}
.ke-lockbar b{color:#fff}
.ke-lockbar-ic{width:38px;height:38px;border-radius:12px;background:rgba(255,93,110,.18);display:grid;place-items:center;color:var(--ke-red);flex-shrink:0;animation:ke-pingRed 2.2s infinite}
.ke-lockbar p{margin:0;font-size:13px;line-height:1.45;font-weight:600}

/* ── Hero ──────────────────────────────────────────────── */
.ke-hero{position:relative;overflow:hidden;border-radius:24px;padding:18px;background:radial-gradient(120% 150% at 0% 0%,#18305A 0%,#0C1830 42%,#070E1C 100%);border:1px solid var(--ke-line);box-shadow:0 28px 60px -28px rgba(4,10,25,.85);animation:ke-fadeUp .55s backwards}
@media(min-width:640px){.ke-hero{padding:24px;border-radius:28px}}
.ke-hero::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:30px 30px;-webkit-mask-image:radial-gradient(70% 90% at 80% 0%,#000 0%,transparent 75%);mask-image:radial-gradient(70% 90% at 80% 0%,#000 0%,transparent 75%)}
.ke-orb{position:absolute;border-radius:50%;filter:blur(46px);pointer-events:none;animation:ke-float 14s ease-in-out infinite}
.ke-orb.a{width:280px;height:280px;background:rgba(212,175,55,.32);top:-130px;right:-70px}
.ke-orb.b{width:220px;height:220px;background:rgba(94,156,255,.2);bottom:-120px;left:18%;animation-delay:-7s}
.ke-hero-in{position:relative;z-index:1}
.ke-hero-top{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
.ke-brand{display:flex;align-items:center;gap:12px;min-width:0}
.ke-brand-ic{width:46px;height:46px;border-radius:15px;background:var(--ke-grad-gold);display:grid;place-items:center;color:#1B1405;flex-shrink:0;box-shadow:0 10px 26px -8px rgba(212,175,55,.7),inset 0 1px 0 rgba(255,255,255,.55);animation:ke-bob 5s ease-in-out infinite}
.ke-title{font-size:21px;font-weight:800;margin:0;letter-spacing:-.025em;line-height:1.15;background:linear-gradient(92deg,#FFFFFF 10%,#F3D27A 90%);-webkit-background-clip:text;background-clip:text;color:transparent}
@media(min-width:640px){.ke-title{font-size:24px}}
.ke-sub{font-size:12px;color:var(--ke-muted);margin:3px 0 0;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.ke-live{width:7px;height:7px;border-radius:50%;background:var(--ke-green);animation:ke-ping 2s infinite;flex-shrink:0}
.ke-live.off{background:var(--ke-red);animation:ke-pingRed 2s infinite}
.ke-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}

.ke-icbtn{height:42px;min-width:42px;padding:0 12px;border-radius:13px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#B9C3D6;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:700;font-size:12.5px;cursor:pointer;transition:background .18s,color .18s,border-color .18s,transform .12s;backdrop-filter:blur(6px)}
.ke-icbtn:hover{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(255,255,255,.18)}
.ke-icbtn.on{color:var(--ke-green);background:rgba(43,209,139,.12);border-color:rgba(43,209,139,.35)}
.ke-icbtn.warn{color:var(--ke-orange);background:rgba(246,166,35,.1);border-color:rgba(246,166,35,.32)}
.ke-icbtn.warn:hover{background:rgba(246,166,35,.18)}
.ke-icbtn .lbl{display:none}
@media(min-width:760px){.ke-icbtn .lbl{display:inline}}
.ke-icbtn:active,.ke-btn-gold:active:not(:disabled),.ke-act:active:not(:disabled),.ke-btn-main:active:not(:disabled),.ke-fab:active{transform:scale(.96)}

.ke-btn-gold{position:relative;overflow:hidden;height:42px;padding:0 18px;border-radius:13px;border:none;background:var(--ke-grad-gold);color:#1B1405;font-weight:800;font-size:13.5px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;white-space:nowrap;box-shadow:0 12px 26px -12px rgba(212,175,55,.85),inset 0 1px 0 rgba(255,255,255,.55);transition:transform .15s,box-shadow .2s,filter .2s}
.ke-btn-gold::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.6),transparent);transform:skewX(-20deg);animation:ke-sweep 3.8s ease-in-out infinite;pointer-events:none}
.ke-btn-gold:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 16px 32px -12px rgba(212,175,55,.95)}
.ke-btn-gold:disabled{opacity:.45;cursor:not-allowed;filter:grayscale(.6)}
.ke-btn-gold:disabled::after{display:none}
.ke-hide-sm{display:none!important}
@media(min-width:640px){.ke-hide-sm{display:inline-flex!important}}

.ke-hero-mid{display:grid;grid-template-columns:1fr;gap:18px;margin-top:22px;align-items:end}
@media(min-width:900px){.ke-hero-mid{grid-template-columns:1fr 1.35fr;gap:26px;margin-top:28px}}
.ke-bal-lbl{font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--ke-muted);display:flex;align-items:center;gap:8px}
.ke-bal{font-size:clamp(30px,8vw,48px);font-weight:800;margin:8px 0 6px;color:#fff;line-height:1.02;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;text-shadow:0 4px 30px rgba(212,175,55,.18)}
.ke-bal small{font-family:var(--ke-font);font-size:13px;color:var(--ke-gold2);font-weight:800;letter-spacing:.12em}
.ke-bal-meta{font-size:12px;color:var(--ke-muted);display:flex;gap:6px 14px;flex-wrap:wrap}
.ke-bal-meta b{color:#DCE3EF;font-weight:700}
.ke-flow{margin-top:16px}
.ke-flow-head{display:flex;justify-content:space-between;font-size:11px;color:var(--ke-muted);font-weight:700;margin-bottom:7px}
.ke-flow-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.07);display:flex;overflow:hidden;gap:3px}
.ke-flow-bar i{display:block;height:100%;border-radius:99px;transform-origin:left;animation:ke-grow 1.1s cubic-bezier(.2,.8,.2,1) .3s backwards}
.ke-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11px;font-weight:700}
.ke-legend span{display:inline-flex;align-items:center;gap:6px}
.ke-legend span::before{content:'';width:8px;height:8px;border-radius:3px;background:currentColor}

.ke-today{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-today>:last-child{grid-column:1/-1}
@media(min-width:560px){.ke-today{grid-template-columns:repeat(3,1fr)}.ke-today>:last-child{grid-column:auto}}
.ke-tile{position:relative;overflow:hidden;border-radius:18px;padding:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px);transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s;animation:ke-fadeUp .55s backwards}
.ke-tile:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.18)}
.ke-tile::after{content:'';position:absolute;width:120px;height:120px;right:-50px;top:-60px;border-radius:50%;background:var(--c);opacity:.16;filter:blur(24px);pointer-events:none}
.ke-tile-h{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.ke-tile-l{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ke-muted);margin:0}
.ke-tile-v{font-size:clamp(17px,4.4vw,21px);font-weight:800;color:var(--c);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-tile-s{font-size:11px;color:var(--ke-dim);margin:3px 0 0}

/* Ikòn chip (koulè pa var --c) */
.ke-chip-ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;color:var(--c);flex-shrink:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);background:color-mix(in srgb,var(--c) 15%,transparent);border-color:color-mix(in srgb,var(--c) 30%,transparent)}

/* ── KPI ───────────────────────────────────────────────── */
.ke-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(min-width:900px){.ke-kpis{grid-template-columns:repeat(4,1fr);gap:14px}}
.ke-kpi{position:relative;overflow:hidden;background:linear-gradient(160deg,#12213D 0%,var(--ke-bg1) 70%);border:1px solid var(--ke-line2);border-radius:20px;padding:14px;box-shadow:var(--ke-shadow);animation:ke-fadeUp .55s backwards;transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s}
@media(min-width:640px){.ke-kpi{padding:16px}}
.ke-kpi:hover{transform:translateY(-3px);border-color:var(--ke-line)}
.ke-kpi::before{content:'';position:absolute;left:16px;right:16px;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--c),transparent);opacity:.55}
.ke-kpi-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;min-height:40px}
.ke-kpi-lbl{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ke-muted);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-kpi-val{font-size:clamp(18px,4.8vw,25px);font-weight:800;margin:4px 0 0;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-kpi-sub{font-size:11px;color:var(--ke-dim);margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-ring{transform:rotate(-90deg)}
.ke-ring circle{transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)}

/* ── Toolbar ───────────────────────────────────────────── */
.ke-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:10px;border-radius:20px;background:var(--ke-bg1);border:1px solid var(--ke-line2);box-shadow:var(--ke-shadow);animation:ke-fadeUp .55s .15s backwards}
.ke-search{position:relative;flex:1 1 260px;min-width:0}
.ke-search input{width:100%;height:46px;padding:0 42px 0 44px;border-radius:14px;border:1.5px solid var(--ke-line2);background:var(--ke-bg0);color:var(--ke-text);font-size:14px;font-family:inherit;outline:none;transition:border-color .18s,box-shadow .18s}
.ke-search input::placeholder{color:#4A5875}
.ke-search input:focus{border-color:var(--ke-gold);box-shadow:0 0 0 4px rgba(212,175,55,.14)}
.ke-search .ic{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--ke-dim);pointer-events:none;transition:color .18s}
.ke-search input:focus~.ic{color:var(--ke-gold)}
.ke-search .clr{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:30px;height:30px;border-radius:9px;border:none;background:rgba(255,255,255,.06);color:var(--ke-muted);display:grid;place-items:center;cursor:pointer;animation:ke-fadeIn .2s}
.ke-search .clr:hover{color:#fff;background:rgba(255,255,255,.12)}
.ke-seg{position:relative;display:grid;grid-template-columns:repeat(3,1fr);padding:4px;border-radius:14px;background:var(--ke-bg0);border:1px solid var(--ke-line2);flex:1 1 100%}
@media(min-width:640px){.ke-seg{flex:0 0 auto}}
.ke-seg button{position:relative;z-index:1;height:38px;padding:0 14px;min-width:84px;border:none;background:transparent;color:var(--ke-muted);font-weight:700;font-size:12.5px;cursor:pointer;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;transition:color .25s}
.ke-seg button:hover{color:#fff}
.ke-seg button.on{color:#1B1405}
.ke-seg-pill{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px)/3);border-radius:10px;background:var(--ke-grad-gold);box-shadow:0 6px 16px -6px rgba(212,175,55,.8);transition:transform .35s cubic-bezier(.3,1.3,.5,1)}
.ke-meta{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;color:var(--ke-muted);padding:0 6px 2px}
.ke-meta b{color:var(--ke-text)}

/* ── Kat kont ──────────────────────────────────────────── */
.ke-grid{display:grid;grid-template-columns:1fr;gap:12px;scroll-margin-top:90px}
@media(min-width:640px){.ke-grid{grid-template-columns:1fr 1fr}}
@media(min-width:1000px){.ke-grid{grid-template-columns:repeat(3,1fr);gap:14px}}
.ke-acc{position:relative;overflow:hidden;border-radius:22px;padding:16px;background:linear-gradient(155deg,#14254A 0%,#0C172C 52%,#08101F 100%);border:1px solid var(--ke-line2);box-shadow:var(--ke-shadow);cursor:pointer;color:var(--ke-text);display:flex;flex-direction:column;gap:14px;outline:none;animation:ke-fadeUp .5s backwards;transition:transform .3s cubic-bezier(.2,.8,.2,1),border-color .3s,box-shadow .3s}
.ke-acc::before{content:'';position:absolute;width:200px;height:200px;right:-80px;top:-100px;border-radius:50%;background:radial-gradient(closest-side,rgba(212,175,55,.24),transparent);opacity:.55;transition:opacity .35s,transform .5s;pointer-events:none}
.ke-acc::after{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.07) 45%,transparent 60%);transform:translateX(-100%);transition:transform .9s;pointer-events:none}
.ke-acc:hover,.ke-acc:focus-visible{transform:translateY(-5px);border-color:rgba(212,175,55,.42);box-shadow:0 26px 44px -20px rgba(2,6,18,.9),0 0 0 1px rgba(212,175,55,.14)}
.ke-acc:hover::before{opacity:1;transform:scale(1.15)}
.ke-acc:hover::after{transform:translateX(100%)}
.ke-acc.off{filter:saturate(.5);opacity:.8}
.ke-acc>*{position:relative;z-index:1}
.ke-acc-head{display:flex;gap:12px;align-items:center;min-width:0}
.ke-av{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-weight:800;font-size:15px;color:#fff;flex-shrink:0;letter-spacing:.02em;background:linear-gradient(135deg,var(--a1),var(--a2));box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 8px 18px -8px var(--a1);text-shadow:0 1px 2px rgba(0,0,0,.25);overflow:hidden}
.ke-av img{width:100%;height:100%;object-fit:cover}
.ke-acc-id{min-width:0;flex:1}
.ke-acc-no{font-family:var(--ke-mono);font-size:10.5px;color:var(--ke-gold2);letter-spacing:.06em;font-weight:700;margin:0}
.ke-acc-name{font-size:15.5px;font-weight:800;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em;color:#fff}
.ke-acc-phone{font-size:11.5px;color:var(--ke-muted);display:flex;align-items:center;gap:5px;margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-badges{display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;align-self:flex-start}
.ke-badge{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:99px;font-size:10px;font-weight:800;letter-spacing:.04em;color:var(--c);white-space:nowrap;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);background:color-mix(in srgb,var(--c) 14%,transparent);border-color:color-mix(in srgb,var(--c) 32%,transparent)}
.ke-acc-bal{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.035);border:1px solid var(--ke-line2)}
.ke-acc-bal .l{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ke-dim);font-weight:800;margin:0}
.ke-acc-bal .v{font-size:23px;font-weight:800;color:#fff;line-height:1.1;margin:3px 0 0;white-space:nowrap}
.ke-acc-bal .v small{font-family:var(--ke-font);font-size:10.5px;color:var(--ke-gold2);margin-left:5px;letter-spacing:.1em}
.ke-lock{font-size:11px;font-weight:700;color:var(--ke-orange);display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.ke-acc-acts{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}
.ke-acc-acts.adm{grid-template-columns:1fr 1fr auto auto}
.ke-act{height:40px;border-radius:12px;border:1px solid transparent;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-weight:800;font-size:12.5px;cursor:pointer;padding:0 12px;transition:background .2s,color .2s,border-color .2s,transform .12s,box-shadow .2s}
.ke-act.dep{color:var(--ke-green);background:rgba(43,209,139,.1);border-color:rgba(43,209,139,.25)}
.ke-act.dep:hover:not(:disabled){background:var(--ke-green);color:#03140C;box-shadow:0 8px 20px -8px var(--ke-green)}
.ke-act.ret{color:var(--ke-red);background:rgba(255,93,110,.09);border-color:rgba(255,93,110,.25)}
.ke-act.ret:hover:not(:disabled){background:var(--ke-red);color:#fff;box-shadow:0 8px 20px -8px var(--ke-red)}
.ke-act.ghost{color:#B9C3D6;background:rgba(255,255,255,.05);border-color:var(--ke-line2);width:40px;padding:0}
.ke-act.ghost:hover{color:#fff;background:rgba(255,255,255,.1)}
.ke-act.del{color:#FF8A96;background:rgba(255,93,110,.07);border-color:rgba(255,93,110,.22);width:40px;padding:0}
.ke-act.del:hover{background:rgba(255,93,110,.2);color:#fff}
.ke-act:disabled{opacity:.5;cursor:not-allowed;background:rgba(255,255,255,.04);color:var(--ke-dim);border-color:var(--ke-line2)}

/* Skeleton */
.ke-skel{background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.1) 37%,rgba(255,255,255,.04) 63%);background-size:400% 100%;animation:ke-shimmer 1.4s ease infinite;border-radius:9px}

/* Vid */
.ke-empty{text-align:center;padding:48px 20px;border-radius:24px;background:var(--ke-bg1);border:1px dashed rgba(212,175,55,.25);color:var(--ke-muted);animation:ke-fadeUp .5s backwards}
.ke-empty-ic{width:72px;height:72px;border-radius:22px;margin:0 auto 14px;display:grid;place-items:center;color:var(--ke-gold);background:rgba(212,175,55,.1);border:1px solid rgba(212,175,55,.25);animation:ke-bob 3s ease-in-out infinite}
.ke-empty h3{color:#fff;font-size:16px;margin:0 0 4px;font-weight:800}
.ke-empty p{font-size:13px;margin:0 0 16px}

/* Pajinasyon */
.ke-pager{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 8px 8px 16px;border-radius:18px;background:var(--ke-bg1);border:1px solid var(--ke-line2);color:var(--ke-muted);font-size:12px;box-shadow:var(--ke-shadow)}
.ke-pages{display:flex;gap:6px;align-items:center}
.ke-pnums{display:none;gap:6px}
@media(min-width:480px){.ke-pnums{display:flex}.ke-pcur{display:none}}
.ke-pcur{font-family:var(--ke-mono);font-weight:800;color:var(--ke-text);min-width:52px;text-align:center}
.ke-pg{min-width:38px;height:38px;padding:0 6px;border-radius:11px;border:1px solid var(--ke-line2);background:rgba(255,255,255,.04);color:#B9C3D6;font-weight:800;font-size:12.5px;cursor:pointer;display:grid;place-items:center;font-family:var(--ke-mono);transition:all .18s}
.ke-pg:hover:not(:disabled):not(.on){background:rgba(255,255,255,.1);color:#fff}
.ke-pg.on{background:var(--ke-grad-gold);color:#1B1405;border-color:transparent;box-shadow:0 6px 16px -6px rgba(212,175,55,.8)}
.ke-pg:disabled{opacity:.35;cursor:default}
.ke-pg.dots{border:none;background:none;cursor:default;min-width:20px}

/* FAB mobil */
.ke-fab{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:60;height:56px;padding:0 22px;border-radius:18px;border:none;background:var(--ke-grad-gold);color:#1B1405;font-weight:800;font-size:14.5px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 18px 36px -12px rgba(212,175,55,.9),0 4px 12px rgba(0,0,0,.35);animation:ke-pop .5s .4s backwards;transition:transform .15s}
@media(min-width:640px){.ke-fab{display:none}}

/* ── Modal ─────────────────────────────────────────────── */
.ke-ov{position:fixed;inset:0;z-index:1000;background:rgba(3,7,16,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:flex-end;justify-content:center;animation:ke-fadeIn .22s both}
.ke-ov.closing{animation:ke-fadeOut .22s both}
.ke-sheet{position:relative;width:100%;max-width:var(--w,540px);max-height:94vh;max-height:94dvh;display:flex;flex-direction:column;background:linear-gradient(180deg,#101D37 0%,#0A1426 100%);border:1px solid var(--ke-line);border-bottom:none;border-radius:26px 26px 0 0;box-shadow:0 -24px 70px rgba(0,0,0,.6);color:var(--ke-text);overflow:hidden;animation:ke-sheetUp .42s cubic-bezier(.22,1,.36,1)}
.ke-ov.closing .ke-sheet{animation:ke-sheetDown .22s ease-in both}
@media(min-width:640px){
  .ke-ov{align-items:center;padding:20px}
  .ke-sheet{border-radius:26px;border-bottom:1px solid var(--ke-line);max-height:90vh;animation:ke-pop .38s cubic-bezier(.22,1,.36,1)}
  .ke-ov.closing .ke-sheet{animation:ke-popOut .2s ease-in both}
}
.ke-sheet-glow{position:absolute;top:-140px;left:50%;width:360px;height:240px;transform:translateX(-50%);border-radius:50%;background:var(--accent,#D4AF37);opacity:.18;filter:blur(50px);pointer-events:none}
.ke-grab{width:42px;height:4px;border-radius:99px;background:rgba(255,255,255,.18);margin:10px auto 0;flex-shrink:0}
@media(min-width:640px){.ke-grab{display:none}}
.ke-mhead{position:relative;display:flex;align-items:center;gap:12px;padding:14px 18px;flex-shrink:0}
.ke-mhead-ic{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:var(--accent);flex-shrink:0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);background:color-mix(in srgb,var(--accent) 16%,transparent);border-color:color-mix(in srgb,var(--accent) 34%,transparent)}
.ke-mtitle{font-size:16.5px;font-weight:800;margin:0;letter-spacing:-.015em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-msub{font-size:11.5px;color:var(--ke-muted);margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-x{margin-left:auto;width:38px;height:38px;border-radius:12px;border:1px solid var(--ke-line2);background:rgba(255,255,255,.05);color:var(--ke-muted);display:grid;place-items:center;cursor:pointer;transition:all .25s;flex-shrink:0}
.ke-x:hover{color:#fff;background:rgba(255,255,255,.12);transform:rotate(90deg)}
.ke-mbody{position:relative;flex:1;overflow-y:auto;padding:4px 18px 20px;overscroll-behavior:contain}
.ke-mfoot{position:relative;display:flex;gap:10px;padding:12px 18px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--ke-line2);background:rgba(6,12,24,.65);flex-shrink:0}
.ke-stackv{display:flex;flex-direction:column;gap:14px}

/* Fòm */
.ke-sec{background:rgba(255,255,255,.025);border:1px solid var(--ke-line2);border-radius:18px;padding:14px;margin-bottom:12px;animation:ke-fadeUp .45s backwards}
.ke-sec-h{display:flex;align-items:center;gap:10px;margin:0 0 12px}
.ke-sec-n{width:26px;height:26px;border-radius:9px;background:var(--ke-grad-gold);color:#1B1405;font-size:12px;font-weight:800;display:grid;place-items:center;flex-shrink:0}
.ke-sec-t{font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ke-gold2);margin:0;display:flex;align-items:center;gap:6px}
.ke-sec-opt{margin-left:auto;font-size:10px;font-weight:700;color:var(--ke-dim);letter-spacing:.06em;text-transform:uppercase}
.ke-g2{display:grid;grid-template-columns:1fr;gap:10px}
@media(min-width:440px){.ke-g2{grid-template-columns:1fr 1fr}}
.ke-g2x{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-g3{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(min-width:480px){.ke-g3{grid-template-columns:repeat(3,1fr)}}
.ke-g3.tri{grid-template-columns:repeat(3,1fr)}
.ke-g3.tri .ke-mtile{padding:10px 11px}
.ke-mt{margin-top:10px}
.ke-label{display:block;font-size:11px;font-weight:700;color:var(--ke-muted);margin:0 0 6px;letter-spacing:.03em}
.ke-input{width:100%;height:46px;padding:0 14px;border-radius:13px;font-size:14px;border:1.5px solid var(--ke-line2);background:var(--ke-bg0);color:var(--ke-text);outline:none;transition:border-color .18s,box-shadow .18s,background .18s;font-family:inherit}
textarea.ke-input{height:auto;min-height:72px;padding:11px 14px;resize:vertical;line-height:1.45}
select.ke-input{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:38px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238B98B0' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 13px center}
.ke-input:focus{border-color:var(--ke-gold);box-shadow:0 0 0 4px rgba(212,175,55,.14);background:#08111F}
.ke-input.err{border-color:var(--ke-red);box-shadow:0 0 0 4px rgba(255,93,110,.12)}
.ke-input::placeholder{color:#3F4D69}
.ke-scope select option{background:#0B1528;color:#EEF2F8}
.ke-err{font-size:11px;color:var(--ke-red);margin:6px 0 0;font-weight:700;display:flex;align-items:center;gap:5px;animation:ke-shake .35s}
@media(max-width:639px){.ke-input,.ke-search input{font-size:16px}}

.ke-numchip{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:16px;margin-bottom:12px;background:linear-gradient(120deg,rgba(212,175,55,.16),rgba(212,175,55,.04));border:1px solid rgba(212,175,55,.3);animation:ke-fadeUp .4s backwards}
.ke-numchip .l{font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:var(--ke-gold2);margin:0}
.ke-numchip .v{font-family:var(--ke-mono);font-weight:800;font-size:15px;color:#fff;margin:2px 0 0;letter-spacing:.04em}
.ke-numchip .t{font-size:10px;font-weight:800;color:var(--ke-gold);padding:4px 9px;border-radius:99px;background:rgba(212,175,55,.14);display:inline-flex;align-items:center;gap:4px}

/* Foto */
.ke-photo{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;height:118px;border-radius:16px;cursor:pointer;overflow:hidden;border:1.5px dashed rgba(255,255,255,.14);background:rgba(255,255,255,.025);color:var(--ke-muted);transition:all .2s;text-align:center;padding:0 10px}
.ke-photo:hover{border-color:rgba(212,175,55,.6);background:rgba(212,175,55,.05);color:var(--ke-gold2)}
.ke-photo.has{border-style:solid;border-color:var(--ke-gold);padding:0}
.ke-photo img{width:100%;height:100%;object-fit:cover;animation:ke-fadeIn .3s}
.ke-photo .ok{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:var(--ke-green);color:#03140C;display:grid;place-items:center;animation:ke-pop .3s}
.ke-photo .ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.05)}
.ke-photo .h{font-size:11px;font-weight:600}

/* Montan */
.ke-amount{position:relative;border-radius:20px;padding:16px 14px;text-align:center;background:var(--ke-bg0);border:1.5px solid rgba(255,255,255,.1);border-color:color-mix(in srgb,var(--accent) 38%,transparent);background:radial-gradient(120% 130% at 50% 0%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 70%),var(--ke-bg0);transition:box-shadow .2s,border-color .2s}
.ke-amount:focus-within{border-color:var(--accent);box-shadow:0 0 0 5px rgba(255,255,255,.04);box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 16%,transparent)}
.ke-amount.err{border-color:var(--ke-red);animation:ke-shake .35s}
.ke-amount-l{font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:0}
.ke-amount input{width:100%;background:transparent;border:none;outline:none;text-align:center;font-family:var(--ke-mono);font-size:clamp(32px,10vw,42px);font-weight:800;color:#fff;padding:6px 0 0;letter-spacing:-.02em;caret-color:var(--accent)}
.ke-amount input::placeholder{color:#2A3752}
.ke-amount-cur{font-size:11px;font-weight:800;color:var(--ke-muted);letter-spacing:.16em}
.ke-quick{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:12px}
.ke-q{height:32px;padding:0 12px;border-radius:99px;border:1px solid var(--ke-line2);background:rgba(255,255,255,.05);color:#B9C3D6;font-size:12px;font-weight:700;font-family:var(--ke-mono);cursor:pointer;transition:all .15s}
.ke-q:hover{color:#fff;border-color:var(--accent);background:rgba(255,255,255,.08)}
.ke-q.all{font-family:var(--ke-font);color:var(--accent);border-color:var(--accent)}

/* Metòd */
.ke-methods{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.ke-m{height:62px;border-radius:14px;border:1.5px solid var(--ke-line2);background:rgba(255,255,255,.03);color:var(--ke-muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:11.5px;font-weight:700;cursor:pointer;transition:all .2s;position:relative}
.ke-m:hover{color:var(--ke-text);border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.05)}
.ke-m.on{color:var(--ke-gold2);border-color:var(--ke-gold);background:rgba(212,175,55,.1);box-shadow:0 0 0 3px rgba(212,175,55,.1)}
.ke-m.on::after{content:'';position:absolute;top:7px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--ke-gold);box-shadow:0 0 10px var(--ke-gold);animation:ke-pop .25s}

/* Rezime kalkil */
.ke-break{margin-top:12px;border-radius:16px;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid var(--ke-line2);font-size:13px;animation:ke-fadeUp .35s backwards}
.ke-ln{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0}
.ke-ln .k{color:var(--ke-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ke-ln .v{font-family:var(--ke-mono);font-weight:700;white-space:nowrap}
.ke-ln.total{border-top:1px dashed rgba(255,255,255,.14);margin-top:6px;padding-top:11px}
.ke-ln.total .k{color:#fff;font-weight:800}
.ke-ln.total .v{font-size:17px;font-weight:800}
.ke-tag{font-size:9.5px;font-weight:800;letter-spacing:.06em;padding:2px 7px;border-radius:6px;color:var(--ke-red);background:rgba(255,93,110,.14)}
.ke-stack{height:10px;border-radius:99px;background:rgba(255,255,255,.06);display:flex;overflow:hidden;gap:2px;margin-top:12px}
.ke-stack i{display:block;height:100%;transition:width .55s cubic-bezier(.2,.8,.2,1)}

.ke-alert{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;font-size:12.5px;line-height:1.5;font-weight:600;color:#E6EBF3;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);background:color-mix(in srgb,var(--c) 11%,transparent);border-color:color-mix(in srgb,var(--c) 32%,transparent);animation:ke-fadeUp .35s backwards}
.ke-alert svg{color:var(--c);flex-shrink:0;margin-top:1px}
.ke-alert strong{color:#fff}

/* Bouton footer */
.ke-btn-ghost{flex:1;height:50px;border-radius:15px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#B9C3D6;font-weight:700;font-size:14px;cursor:pointer;transition:all .18s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.ke-btn-ghost:hover{color:#fff;background:rgba(255,255,255,.06)}
.ke-btn-main{flex:2;height:50px;border-radius:15px;border:none;font-weight:800;font-size:14.5px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;position:relative;overflow:hidden;transition:transform .15s,filter .2s,opacity .2s,box-shadow .2s}
.ke-btn-main::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg);animation:ke-sweep 3.5s ease-in-out infinite;pointer-events:none}
.ke-btn-main:hover:not(:disabled){filter:brightness(1.07);transform:translateY(-1px)}
.ke-btn-main:disabled{opacity:.42;cursor:not-allowed;box-shadow:none!important}
.ke-btn-main:disabled::after{display:none}
.ke-btn-main.gold{background:var(--ke-grad-gold);color:#1B1405;box-shadow:0 14px 28px -14px rgba(212,175,55,.9)}
.ke-btn-main.green{background:linear-gradient(135deg,#3CE3A0,#14A468);color:#03140C;box-shadow:0 14px 28px -14px rgba(43,209,139,.9)}
.ke-btn-main.red{background:linear-gradient(135deg,#F2566B,#BE2A40);color:#fff;box-shadow:0 14px 28px -14px rgba(255,93,110,.9)}
.ke-btn-main.orange{background:linear-gradient(135deg,#F9BA52,#D3850A);color:#1E1300;box-shadow:0 14px 28px -14px rgba(246,166,35,.9)}
.ke-btn-main.danger{background:linear-gradient(135deg,#E5394F,#9A1427);color:#fff;box-shadow:0 14px 28px -14px rgba(229,57,79,.9)}

/* Mini kont nan modal tx */
.ke-mini-acc{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid var(--ke-line2);animation:ke-fadeUp .35s backwards}
.ke-mini-acc .r{margin-left:auto;text-align:right;flex-shrink:0}
.ke-mini-acc .r .l{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ke-dim);font-weight:800;margin:0}
.ke-mini-acc .r .v{font-size:16px;font-weight:800;color:var(--ke-green);margin:2px 0 0}
.ke-preview{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px;border-radius:16px;animation:ke-fadeUp .3s backwards;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);background:color-mix(in srgb,var(--accent) 10%,transparent);border-color:color-mix(in srgb,var(--accent) 30%,transparent)}
.ke-preview .col{min-width:0}
.ke-preview .l{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ke-muted);font-weight:800;margin:0}
.ke-preview .v{font-family:var(--ke-mono);font-weight:800;font-size:15px;margin:3px 0 0;white-space:nowrap}
.ke-preview .arrow{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;color:var(--accent);background:rgba(255,255,255,.06)}

/* Detay — kanè */
.ke-pass{position:relative;overflow:hidden;border-radius:22px;padding:18px;background:var(--ke-grad-gold);color:#1B1405;box-shadow:0 22px 44px -20px rgba(212,175,55,.75),inset 0 1px 0 rgba(255,255,255,.5);animation:ke-pop .5s backwards}
.ke-pass::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 2px,transparent 2px 14px);pointer-events:none}
.ke-pass::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg);animation:ke-sweep 4.5s ease-in-out 1s infinite;pointer-events:none}
.ke-pass>*{position:relative;z-index:1}
.ke-pass-top{display:flex;gap:12px;align-items:center;min-width:0}
.ke-pass-ph{width:56px;height:56px;border-radius:17px;overflow:hidden;flex-shrink:0;display:grid;place-items:center;font-weight:900;font-size:19px;background:rgba(27,20,5,.14);border:2px solid rgba(255,255,255,.55);cursor:pointer;padding:0;color:#1B1405}
.ke-pass-ph img{width:100%;height:100%;object-fit:cover}
.ke-pass-name{font-size:18px;font-weight:800;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.015em}
.ke-pass-no{font-family:var(--ke-mono);font-size:11px;font-weight:700;opacity:.72;letter-spacing:.08em;margin:2px 0 0}
.ke-pass-chip{margin-left:auto;width:40px;height:30px;border-radius:7px;flex-shrink:0;background:linear-gradient(135deg,#FFF3C4,#C9A13B);border:1px solid rgba(27,20,5,.25);position:relative;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}
.ke-pass-chip::before{content:'';position:absolute;inset:6px 8px;border:1px solid rgba(27,20,5,.3);border-radius:3px}
.ke-pass-bal{margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap}
.ke-pass-bal .l{font-size:10px;letter-spacing:.18em;font-weight:800;opacity:.65;margin:0}
.ke-pass-bal .v{font-size:clamp(26px,7.5vw,34px);font-weight:800;line-height:1;margin:5px 0 0;white-space:nowrap}
.ke-pass-bal .v small{font-family:var(--ke-font);font-size:12px;margin-left:6px;letter-spacing:.12em;opacity:.8}
.ke-pass-meta{display:flex;gap:6px 14px;flex-wrap:wrap;font-size:11.5px;font-weight:700;opacity:.78;margin-top:12px}
.ke-pass-meta span{display:inline-flex;align-items:center;gap:5px}
.ke-pass-lock{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;padding:5px 10px;border-radius:99px;background:rgba(27,20,5,.14)}

.ke-mtile{border-radius:16px;padding:12px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);background:color-mix(in srgb,var(--c) 9%,transparent);border-color:color-mix(in srgb,var(--c) 24%,transparent);animation:ke-fadeUp .4s backwards;min-width:0}
.ke-mtile .l{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ke-muted);font-weight:800;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-mtile .v{font-family:var(--ke-mono);font-weight:800;font-size:15px;color:var(--c);margin:4px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.ke-info{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ke-info div{padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid var(--ke-line2);min-width:0}
.ke-info .l{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ke-dim);font-weight:800;margin:0}
.ke-info .v{font-size:13px;color:var(--ke-text);font-weight:700;margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

.ke-kyc{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ke-kyc button{position:relative;height:110px;border-radius:16px;overflow:hidden;border:1px solid var(--ke-line2);padding:0;cursor:zoom-in;background:var(--ke-bg0)}
.ke-kyc img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.ke-kyc button:hover img{transform:scale(1.06)}
.ke-kyc span{position:absolute;left:8px;bottom:8px;font-size:10px;font-weight:800;padding:4px 8px;border-radius:8px;background:rgba(6,12,24,.75);color:#fff;letter-spacing:.04em}

.ke-row-acts{display:grid;grid-template-columns:1fr 1fr auto auto;gap:8px}
.ke-row-acts .ke-act{height:46px;font-size:13.5px}
.ke-row-acts .ke-act.ghost,.ke-row-acts .ke-act.gold{width:46px}
.ke-act.gold{color:var(--ke-gold2);background:rgba(212,175,55,.1);border-color:rgba(212,175,55,.3);width:40px;padding:0}
.ke-act.gold:hover:not(:disabled){background:rgba(212,175,55,.22)}

.ke-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}
.ke-h p{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ke-muted);margin:0}
.ke-h span{font-size:11px;font-weight:800;color:var(--ke-gold2);padding:3px 9px;border-radius:99px;background:rgba(212,175,55,.12)}

.ke-tl{display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto;padding-right:2px}
.ke-tx{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:15px;background:rgba(255,255,255,.03);border:1px solid var(--ke-line2);animation:ke-fadeUp .4s backwards;transition:background .15s,border-color .15s}
.ke-tx:hover{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.12)}
.ke-tx-ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:var(--c);flex-shrink:0;background:rgba(255,255,255,.05);background:color-mix(in srgb,var(--c) 15%,transparent)}
.ke-tx-mid{flex:1;min-width:0}
.ke-tx-t{display:flex;justify-content:space-between;gap:8px;font-weight:800;font-size:13px;color:#fff}
.ke-tx-amt{font-family:var(--ke-mono);color:var(--c);white-space:nowrap}
.ke-tx-s{font-size:11px;color:var(--ke-muted);margin:3px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ke-mini{width:32px;height:32px;border-radius:10px;border:1px solid var(--ke-line2);background:rgba(255,255,255,.04);color:#B9C3D6;display:grid;place-items:center;cursor:pointer;flex-shrink:0;transition:all .15s;padding:0}
.ke-mini:hover:not(:disabled){color:#fff;background:rgba(255,255,255,.1)}
.ke-mini.gold{color:var(--ke-gold2);border-color:rgba(212,175,55,.25)}
.ke-mini.red{color:#FF8A96;border-color:rgba(255,93,110,.25)}
.ke-mini:disabled{opacity:.5;cursor:wait}

.ke-danger{border-radius:18px;padding:14px;background:linear-gradient(120deg,rgba(255,93,110,.1),rgba(255,93,110,.03));border:1px solid rgba(255,93,110,.3)}
.ke-danger p{font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#FF8A96;margin:0 0 10px;display:flex;align-items:center;gap:6px}
.ke-danger button{width:100%;height:46px;border-radius:13px;border:1px solid rgba(255,93,110,.45);background:rgba(255,93,110,.12);color:#FFB3BC;font-weight:800;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s}
.ke-danger button:hover:not(:disabled){background:#E5394F;color:#fff;border-color:#E5394F}

/* Lightbox */
.ke-lb{position:fixed;inset:0;z-index:1200;background:rgba(2,5,12,.9);display:grid;place-items:center;padding:20px;animation:ke-fadeIn .2s;cursor:zoom-out}
.ke-lb img{max-width:100%;max-height:84vh;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.6);animation:ke-pop .3s}
.ke-lb p{position:absolute;bottom:calc(20px + env(safe-area-inset-bottom,0px));left:0;right:0;text-align:center;color:#fff;font-weight:700;font-size:13px;margin:0}

/* Fèmen kès — etap */
.ke-steps{display:flex;align-items:center;gap:10px;margin:0 0 14px}
.ke-step{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:var(--ke-dim);white-space:nowrap}
.ke-step b{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;border:1.5px solid var(--ke-line2);font-size:12px;transition:all .3s}
.ke-step.on{color:#fff}
.ke-step.on b{background:var(--ke-grad-gold);color:#1B1405;border-color:transparent;box-shadow:0 0 0 4px rgba(212,175,55,.15)}
.ke-step.done{color:var(--ke-green)}
.ke-step.done b{background:rgba(43,209,139,.15);color:var(--ke-green);border-color:rgba(43,209,139,.45)}
.ke-step-line{flex:1;height:3px;min-width:20px;background:var(--ke-line2);border-radius:3px;overflow:hidden}
.ke-step-line i{display:block;height:100%;background:var(--ke-grad-gold);transition:width .5s cubic-bezier(.2,.8,.2,1)}
.ke-diff{border-radius:18px;padding:14px 16px;animation:ke-pop .35s backwards;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);background:color-mix(in srgb,var(--c) 12%,transparent);border-color:color-mix(in srgb,var(--c) 38%,transparent)}
.ke-diff .top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.ke-diff .k{font-size:13px;font-weight:800;color:var(--c)}
.ke-diff .v{font-family:var(--ke-mono);font-weight:800;font-size:20px;color:var(--c);white-space:nowrap}
.ke-diff .s{font-size:12px;color:#C9D1DF;margin:4px 0 0;font-weight:600}
.ke-success{text-align:center;padding:10px 0 4px}
.ke-check{width:92px;height:92px;margin:6px auto 16px;border-radius:50%;background:rgba(43,209,139,.13);display:grid;place-items:center;animation:ke-pop .5s backwards;box-shadow:0 0 0 12px rgba(43,209,139,.06),0 0 40px rgba(43,209,139,.25)}
.ke-check path{stroke-dasharray:50;stroke-dashoffset:50;animation:ke-draw .6s .3s ease forwards}
.ke-success h3{font-size:19px;font-weight:800;color:#fff;margin:0 0 4px}
.ke-success p{font-size:13px;color:var(--ke-muted);margin:0}

/* Aksesibilite: mwens mouvman */
@media (prefers-reduced-motion:reduce){
  .ke-scope *,.ke-scope *::before,.ke-scope *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
}
`