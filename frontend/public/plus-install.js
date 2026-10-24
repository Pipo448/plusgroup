/*!
 * PLUS GROUP — plus-install.js  (bannyè "Enstale app la sou telefòn ou")
 * Yon sèl fichye pou TOUT app Plus Group yo: Plus Resto, PG Stock, PlusMarket, PlusMed Manager...
 *
 * KIJAN POU W METE L (nan index.html app la, anvan </body>):
 *   <link rel="manifest" href="/manifest.webmanifest">
 *   <script src="/plus-install.js"
 *           data-app="PG Stock"                 (non app la)
 *           data-icon="/icons/stock-192.png"    (ikòn app la)
 *           data-color="#1a1464"                (koulè bouton an)
 *           data-manifest="/manifest-stock.webmanifest" (opsyonèl: script la mete manifest la li menm,
 *                                                 sèlman sou paj ki pa nan data-skip — itil si 2 app pataje menm domèn)
 *           data-sw="/plus-sw.js"               (opsyonèl: service worker pou anrejistre si pa gen youn deja)
 *           data-skip="/resto,/admin"           (opsyonèl: chemen kote bannyè a PA dwe parèt)
 *           data-lang="fr"                      (opsyonèl: fòse yon lang; sinon li detekte l)
 *           defer></script>
 *
 * Sa l fè:
 *  • Android/Chrome/Edge: montre yon gwo kat "Enstale app la" → bouton an louvri fenèt enstalasyon ofisyèl la.
 *  • iPhone/iPad (Safari): montre etap yo (Pataje → "Sou ekran Akèy").
 *  • Nan navigatè Facebook/Instagram/TikTok: di moun nan louvri paj la nan Chrome oswa Safari.
 *  • Pa parèt si app la deja enstale (mòd "standalone").
 *  • Si moun nan peze "Pita", li pa parèt ankò pandan 3 jou — EKSEPTE si lyen an gen ?install=1
 *    (sa se lyen sit plusgroupe.com nan voye moun yo).
 *  • Lòt kòd ka louvri l: window.PlusInstall.open()
 */
(function () {
  'use strict';
  if (window.PlusInstall) return;

  var me = document.currentScript || document.querySelector('script[src*="plus-install"]');
  var cfg = {
    app:   (me && me.getAttribute('data-app'))   || document.title || 'Plus Group',
    icon:  (me && me.getAttribute('data-icon'))  || '',
    color: (me && me.getAttribute('data-color')) || '#ff6b00',
    sw:    (me && me.getAttribute('data-sw'))    || '',
    skip:  ((me && me.getAttribute('data-skip')) || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
    lang:  (me && me.getAttribute('data-lang'))  || '',
    manifest: (me && me.getAttribute('data-manifest')) || '',
    delay: +((me && me.getAttribute('data-delay')) || 1500)
  };

  var KEY = 'plusInstallHide:' + location.host + ':' + cfg.app;
  var HIDE_DAYS = 3;
  var deferred = null;          // ev\u00e8nman beforeinstallprompt la
  var forced = /[?&#]install=1\b/.test(location.href);

  // ---------- DETEKSYON ----------
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var isMobile = isIOS || isAndroid || /Mobi/i.test(ua);
  var inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|Twitter/i.test(ua);
  var iosNotSafari = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  function standalone() {
    return (window.matchMedia && (matchMedia('(display-mode: standalone)').matches ||
            matchMedia('(display-mode: fullscreen)').matches ||
            matchMedia('(display-mode: minimal-ui)').matches)) || navigator.standalone === true;
  }
  function skipped() {
    var p = location.pathname + location.hash.replace(/^#/, '');
    return cfg.skip.some(function (s) { return p.indexOf(s) === 0 || location.pathname.indexOf(s) === 0; });
  }

  // ---------- LANG ----------
  var T = {
    ht: { title: 'Enstale {app} sou telef\u00f2n ou', sub: 'Louvri l dir\u00e8kteman sou ekran Ak\u00e8y ou, tankou yon vr\u00e8 aplikasyon \u2014 pi rapid, plen ekran, san pase nan navigat\u00e8 a.',
          b1: 'Louvri an 1 klik', b2: 'Plen ekran, pi rapid', b3: 'Gratis \u2014 pa bezwen Play Store',
          install: 'Enstale app la', later: 'Pita', done: '{app} enstale! Ch\u00e8che l sou ekran Ak\u00e8y ou.',
          ios: 'Sou iPhone / iPad (Safari):', ios1: 'Peze bouton <b>Pataje</b> {share} anba ekran an', ios2: 'Desann epi chwazi <b>\u00ab Sur l\'\u00e9cran d\'accueil \u00bb</b> / <b>\u00ab Add to Home Screen \u00bb</b>', ios3: 'Peze <b>Ajouter / Add</b> \u2014 fini!',
          iosSafari: 'Louvri paj sa a nan <b>Safari</b> pou w ka enstale l.',
          and: 'Sou Android (Chrome):', and1: 'Peze <b>\u22ee</b> (3 pwen) anl\u00e8 adwat', and2: 'Chwazi <b>\u00ab Installer l\'application \u00bb</b> oswa <b>\u00ab Ajouter \u00e0 l\'\u00e9cran d\'accueil \u00bb</b>', and3: 'Konfime \u2014 ik\u00f2n nan ap par\u00e8t sou ekran Ak\u00e8y ou',
          inapp: 'Ou nan navigat\u00e8 Facebook/Instagram la. Peze <b>\u22ee</b> oswa <b>\u2026</b> epi chwazi <b>\u00ab Ouvrir dans Chrome / Safari \u00bb</b>, apre sa enstale app la.',
          copy: 'Kopye lyen an', copied: 'Lyen kopye!', ok: 'OK, mwen konprann' },
    fr: { title: 'Installez {app} sur votre t\u00e9l\u00e9phone', sub: 'Ouvrez-la directement depuis votre \u00e9cran d\'accueil, comme une vraie application \u2014 plus rapide, plein \u00e9cran, sans passer par le navigateur.',
          b1: 'Ouverture en 1 clic', b2: 'Plein \u00e9cran, plus rapide', b3: 'Gratuit \u2014 sans Play Store',
          install: 'Installer l\'app', later: 'Plus tard', done: '{app} est install\u00e9e ! Retrouvez-la sur votre \u00e9cran d\'accueil.',
          ios: 'Sur iPhone / iPad (Safari) :', ios1: 'Touchez le bouton <b>Partager</b> {share} en bas de l\'\u00e9cran', ios2: 'Faites d\u00e9filer et choisissez <b>\u00ab Sur l\'\u00e9cran d\'accueil \u00bb</b>', ios3: 'Touchez <b>Ajouter</b> \u2014 c\'est fait !',
          iosSafari: 'Ouvrez cette page dans <b>Safari</b> pour pouvoir l\'installer.',
          and: 'Sur Android (Chrome) :', and1: 'Touchez <b>\u22ee</b> (3 points) en haut \u00e0 droite', and2: 'Choisissez <b>\u00ab Installer l\'application \u00bb</b> ou <b>\u00ab Ajouter \u00e0 l\'\u00e9cran d\'accueil \u00bb</b>', and3: 'Confirmez \u2014 l\'ic\u00f4ne appara\u00eet sur votre \u00e9cran d\'accueil',
          inapp: 'Vous \u00eates dans le navigateur de Facebook/Instagram. Touchez <b>\u22ee</b> ou <b>\u2026</b> puis <b>\u00ab Ouvrir dans Chrome / Safari \u00bb</b>, ensuite installez l\'app.',
          copy: 'Copier le lien', copied: 'Lien copi\u00e9 !', ok: 'OK, compris' },
    en: { title: 'Install {app} on your phone', sub: 'Open it straight from your home screen like a real app \u2014 faster, full screen, no browser bar.',
          b1: 'Opens in 1 tap', b2: 'Full screen, faster', b3: 'Free \u2014 no Play Store needed',
          install: 'Install the app', later: 'Later', done: '{app} is installed! Find it on your home screen.',
          ios: 'On iPhone / iPad (Safari):', ios1: 'Tap the <b>Share</b> button {share} at the bottom', ios2: 'Scroll down and choose <b>\u201cAdd to Home Screen\u201d</b>', ios3: 'Tap <b>Add</b> \u2014 done!',
          iosSafari: 'Open this page in <b>Safari</b> to install it.',
          and: 'On Android (Chrome):', and1: 'Tap <b>\u22ee</b> (3 dots) at the top right', and2: 'Choose <b>\u201cInstall app\u201d</b> or <b>\u201cAdd to Home screen\u201d</b>', and3: 'Confirm \u2014 the icon appears on your home screen',
          inapp: 'You are in the Facebook/Instagram browser. Tap <b>\u22ee</b> or <b>\u2026</b> and choose <b>\u201cOpen in Chrome / Safari\u201d</b>, then install the app.',
          copy: 'Copy link', copied: 'Link copied!', ok: 'OK, got it' },
    es: { title: 'Instale {app} en su tel\u00e9fono', sub: '\u00c1brala directamente desde su pantalla de inicio, como una app real \u2014 m\u00e1s r\u00e1pida, pantalla completa, sin barra del navegador.',
          b1: 'Se abre en 1 toque', b2: 'Pantalla completa, m\u00e1s r\u00e1pida', b3: 'Gratis \u2014 sin Play Store',
          install: 'Instalar la app', later: 'M\u00e1s tarde', done: '\u00a1{app} est\u00e1 instalada! B\u00fasquela en su pantalla de inicio.',
          ios: 'En iPhone / iPad (Safari):', ios1: 'Toque el bot\u00f3n <b>Compartir</b> {share} abajo', ios2: 'Despl\u00e1cese y elija <b>\u00abAgregar a inicio\u00bb</b>', ios3: 'Toque <b>Agregar</b> \u2014 \u00a1listo!',
          iosSafari: 'Abra esta p\u00e1gina en <b>Safari</b> para instalarla.',
          and: 'En Android (Chrome):', and1: 'Toque <b>\u22ee</b> (3 puntos) arriba a la derecha', and2: 'Elija <b>\u00abInstalar app\u00bb</b> o <b>\u00abAgregar a pantalla de inicio\u00bb</b>', and3: 'Confirme \u2014 el \u00edcono aparecer\u00e1 en su pantalla de inicio',
          inapp: 'Est\u00e1 en el navegador de Facebook/Instagram. Toque <b>\u22ee</b> o <b>\u2026</b> y elija <b>\u00abAbrir en Chrome / Safari\u00bb</b>, luego instale la app.',
          copy: 'Copiar enlace', copied: '\u00a1Enlace copiado!', ok: 'OK, entendido' }
  };
  function lang() {
    var c = cfg.lang, ls = '';
    try { ls = localStorage.getItem('plusLang') || localStorage.getItem('lang') || localStorage.getItem('i18nextLng') || localStorage.getItem('language') || ''; } catch (e) {}
    var cands = [c, ls, document.documentElement.lang, (navigator.language || '')];
    for (var i = 0; i < cands.length; i++) {
      var l = String(cands[i] || '').toLowerCase().slice(0, 2);
      if (l === 'kr' || l === 'cr') l = 'ht';
      if (T[l]) return l;
    }
    return 'ht';
  }
  function tr(k) { var L = T[lang()]; return (L[k] || T.fr[k] || k).replace(/\{app\}/g, esc(cfg.app)).replace('{share}', SHARE); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SHARE = '<svg class="pi-share" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';

  // ---------- STIL ----------
  function css() {
    if (document.getElementById('pi-css')) return;
    var s = document.createElement('style'); s.id = 'pi-css';
    s.textContent =
      '.pi-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(5,8,20,.55);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .25s;font-family:inherit;-webkit-tap-highlight-color:transparent}' +
      '.pi-ov.on{opacity:1}' +
      '.pi-card{--pi:' + cfg.color + ';width:100%;max-width:440px;background:#fff;color:#111827;border-radius:22px 22px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.25);transform:translateY(40px);transition:transform .3s cubic-bezier(.2,.9,.3,1.2);max-height:92vh;overflow:auto;box-sizing:border-box}' +
      '.pi-ov.on .pi-card{transform:none}' +
      '@media(min-width:600px){.pi-ov{align-items:center}.pi-card{border-radius:22px;margin:16px}}' +
      '.pi-grab{width:44px;height:5px;border-radius:3px;background:#e5e7eb;margin:-8px auto 14px}' +
      '.pi-top{display:flex;gap:14px;align-items:center}' +
      '.pi-ic{width:64px;height:64px;border-radius:16px;flex:none;background:var(--pi);box-shadow:0 6px 18px rgba(0,0,0,.18);overflow:hidden;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:28px}' +
      '.pi-ic img{width:100%;height:100%;object-fit:cover}' +
      '.pi-h{font-size:19px;font-weight:800;line-height:1.25;margin:0}' +
      '.pi-sub{font-size:14px;color:#4b5563;line-height:1.5;margin:12px 0 0}' +
      '.pi-bul{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 0;padding:0;list-style:none}' +
      '.pi-bul li{font-size:12.5px;font-weight:700;padding:6px 10px;border-radius:999px;background:#f3f4f6;color:#374151}' +
      '.pi-bul li:before{content:"\u2713 ";color:var(--pi)}' +
      '.pi-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:14px;padding:15px 18px;font:inherit;font-size:16px;font-weight:800;cursor:pointer;margin-top:16px;background:var(--pi);color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.18);animation:pi-pulse 2.2s infinite}' +
      '.pi-btn svg{width:20px;height:20px}' +
      '@keyframes pi-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}' +
      '.pi-later{display:block;width:100%;border:0;background:none;color:#6b7280;font:inherit;font-size:14px;font-weight:600;padding:12px;cursor:pointer;margin-top:4px}' +
      '.pi-steps{margin:16px 0 0;padding:14px;border-radius:14px;background:#f9fafb;border:1px solid #eef0f3}' +
      '.pi-steps h4{margin:0 0 8px;font-size:14px;font-weight:800}' +
      '.pi-steps ol{margin:0;padding-left:20px}' +
      '.pi-steps li{font-size:14px;line-height:1.55;margin:4px 0;color:#374151}' +
      '.pi-share{vertical-align:-3px;color:#2563eb}' +
      '.pi-warn{margin-top:14px;padding:12px 14px;border-radius:12px;background:#fff7ed;color:#9a3412;font-size:14px;line-height:1.5;border:1px solid #fed7aa}' +
      '.pi-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483001;background:#111827;color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:90vw;text-align:center}' +
      '@media(prefers-color-scheme:dark){.pi-card{background:#111827;color:#f9fafb}.pi-sub,.pi-steps li{color:#d1d5db}.pi-bul li{background:#1f2937;color:#e5e7eb}.pi-steps{background:#1f2937;border-color:#374151}.pi-grab{background:#374151}.pi-warn{background:#3b2410;color:#fed7aa;border-color:#7c2d12}}';
    document.head.appendChild(s);
  }

  var DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';

  function iconHtml() {
    return '<div class="pi-ic">' + (cfg.icon ? '<img src="' + esc(cfg.icon) + '" alt="">' : esc(cfg.app.replace(/^plus\s*/i, '').charAt(0) || '+')) + '</div>';
  }
  function stepsHtml() {
    if (inApp) return '<div class="pi-warn">' + tr('inapp') + '</div>';
    if (isIOS) {
      if (iosNotSafari) return '<div class="pi-warn">' + tr('iosSafari') + '</div>';
      return '<div class="pi-steps"><h4>' + tr('ios') + '</h4><ol><li>' + tr('ios1') + '</li><li>' + tr('ios2') + '</li><li>' + tr('ios3') + '</li></ol></div>';
    }
    return '<div class="pi-steps"><h4>' + tr('and') + '</h4><ol><li>' + tr('and1') + '</li><li>' + tr('and2') + '</li><li>' + tr('and3') + '</li></ol></div>';
  }

  // ---------- FENÈT LA ----------
  var ov = null;
  function close(remember) {
    if (!ov) return;
    var o = ov; ov = null; o.classList.remove('on');
    setTimeout(function () { o.remove(); }, 260);
    if (remember) { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  }
  function open(showSteps) {
    if (standalone()) return;
    css(); if (ov) close(false);
    var canPrompt = !!deferred;
    // San evènman natif (iPhone, Facebook, Chrome pa pare) → montre etap yo touswit
    var steps = showSteps || !canPrompt;
    ov = document.createElement('div');
    ov.className = 'pi-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML =
      '<div class="pi-card"><div class="pi-grab"></div>' +
      '<div class="pi-top">' + iconHtml() + '<h3 class="pi-h">' + tr('title') + '</h3></div>' +
      '<p class="pi-sub">' + tr('sub') + '</p>' +
      '<ul class="pi-bul"><li>' + tr('b1') + '</li><li>' + tr('b2') + '</li><li>' + tr('b3') + '</li></ul>' +
      (steps ? stepsHtml() : '') +
      (canPrompt ? '<button class="pi-btn" data-pi="go">' + DL + tr('install') + '</button>'
                 : (inApp ? '<button class="pi-btn" data-pi="copy">' + tr('copy') + '</button>' : '<button class="pi-btn" data-pi="ok">' + tr('ok') + '</button>')) +
      '<button class="pi-later" data-pi="later">' + tr('later') + '</button></div>';
    ov.addEventListener('click', function (e) {
      var a = e.target.closest('[data-pi]');
      if (e.target === ov) return close(true);
      if (!a) return;
      var k = a.getAttribute('data-pi');
      if (k === 'later') return close(true);
      if (k === 'ok') return close(true);
      if (k === 'copy') {
        var url = location.href.replace(/([?&])install=1&?/, '$1').replace(/[?&]$/, '');
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast(tr('copied')); }, function () { prompt('', url); });
        return;
      }
      if (k === 'go') promptInstall();
    });
    document.body.appendChild(ov);
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov && ov.classList.add('on'); }); });
  }
  function promptInstall() {
    if (!deferred) { open(true); return; }
    var d = deferred; deferred = null;
    d.prompt();
    (d.userChoice || Promise.resolve({})).then(function (r) {
      close(r && r.outcome !== 'accepted');
    });
  }
  function toast(msg) {
    css();
    var t = document.createElement('div'); t.className = 'pi-toast'; t.innerHTML = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4000);
  }

  // ---------- LÈ POU L PARÈT ----------
  function recentlyHidden() {
    try { var v = +localStorage.getItem(KEY); return v && (Date.now() - v) < HIDE_DAYS * 864e5; } catch (e) { return false; }
  }
  function maybeShow() {
    if (standalone() || skipped()) return;
    if (forced) return open(false);
    if (recentlyHidden()) return;
    if (deferred) return open(false);            // Android/Chrome/Edge: enstalasyon dir\u00e8k
    if (isMobile && (isIOS || inApp)) return open(true); // iPhone / Facebook: etap yo
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (ov) { open(false); return; }               // mete bouton "Enstale" a ajou si fen\u00e8t la te deja louvri
    if (!started) return;
    if (!skipped() && (forced || !recentlyHidden())) open(false);
  });
  window.addEventListener('appinstalled', function () {
    deferred = null; close(false); toast(tr('done'));
  });

  var started = false;
  function start() {
    started = true;
    // Mete manifest la (sèlman si paj sa a pa nan "data-skip" epi pa gen youn deja)
    if (cfg.manifest && !skipped() && !document.querySelector('link[rel="manifest"]')) {
      var l = document.createElement('link'); l.rel = 'manifest'; l.href = cfg.manifest; document.head.appendChild(l);
    }
    // Anrejistre yon service worker si app la poko genyen youn
    if (cfg.sw && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(function (r) {
        if (!r) navigator.serviceWorker.register(cfg.sw).catch(function (e) { console.warn('[plus-install] SW:', e); });
      });
    }
    setTimeout(maybeShow, forced ? 400 : cfg.delay);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  // API piblik
  window.PlusInstall = {
    open: function () { if (standalone()) { toast(tr('done')); return; } deferred ? promptInstall() : open(true); },
    canPrompt: function () { return !!deferred; },
    installed: standalone
  };
})();
