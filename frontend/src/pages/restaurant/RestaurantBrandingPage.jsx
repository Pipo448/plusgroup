// src/pages/restaurant/RestaurantBrandingPage.jsx
// ─── « Koulè restoran » — chak restoran chwazi koulè anblèm li ──────────
// /app/restaurant/branding (admin). Koulè yo chanje SÈLMAN modil Restoran an
// (tablo, tab, meni, kòmand, rapò) ak pòtal kliyan an. Rès app la pa chanje.
// 3 fason pou chwazi: koulè ki soti nan LOGO a (otomatik), PALÈT pare, oswa
// koulè pa w — ak sijesyon dezyèm koulè « ki marye » ak premye a.
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Palette, Wand2, Check, RotateCcw, Save, ImageOff, Loader2, AlertTriangle, Globe2, Plus, UtensilsCrossed, Search,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import {
  DEFAULT_BRAND, buildPalette, matchingColors, normHex, extractLogoColors, brandingApi, publishBrand, contrast,
} from '../../theme/tenantBrand'
import './restoBranding.css'

// ── Tèks (4 lang) ──
const T = {
  ht: {
    title: 'Koulè restoran ou', sub: 'Chwazi koulè anblèm restoran ou. Paj Restoran yo (tab, meni, kòmand, rapò) ak pòtal kliyan an ap pran koulè sa yo.',
    fromLogo: 'Koulè ki nan logo w', fromLogoSub: 'Klike yon koulè pou l vin koulè prensipal la.', auto: 'Palèt otomatik', reading: 'N ap li logo a…',
    noLogo: 'Pa gen logo. Mete logo biznis ou nan Paramèt pou n ka pran koulè l yo.', logoErr: 'Nou pa rive li koulè logo a. Chwazi yon palèt oswa koulè pa w.',
    presets: 'Palèt pare', custom: 'Koulè pa w', primary: 'Koulè prensipal', secondary: 'Dezyèm koulè', match: 'Ki marye ak li',
    sidebar: 'Stil meni bò kote a', sDark: 'Nwa klasik', sBrand: 'Koulè biznis', sNight: 'Nwa fonse',
    portal: 'Pòtal kliyan restoran an', portalSub: 'Itilize menm koulè yo sou paj kliyan yo wè (meni, kòmand, rezèvasyon).',
    preview: 'Apèsi', app: 'Paj Restoran yo', phone: 'Pòtal kliyan',
    save: 'Anrejistre', saving: 'N ap anrejistre…', saved: 'Koulè yo anrejistre! Paj Restoran yo ak pòtal la chanje.', reset: 'Retounen sou koulè PLUS GROUP', resetDone: 'Koulè PLUS GROUP yo retounen.',
    unsaved: 'Ou gen chanjman ki poko anrejistre.', current: 'Koulè aktyèl', defaultBadge: 'Koulè PLUS GROUP',
    nLight: 'Koulè sa a klè anpil: nou fonse l otomatikman pou tèks ak bouton yo rete lizib.',
    nDark: 'Koulè sa a fonse anpil sou fon nwa: nou klere l otomatikman pou l rete vizib.',
    nGray: 'Se yon koulè gri/nwa: app la ap sanble sòb. Yon dezyèm koulè vivan ap bay li plis lavi.',
    nav: ['Meni', 'Tout', 'Plat', 'Bwason'], sales: 'Plat nan meni', newInv: 'Nouvo plat', paid: 'Disponib', dish: 'Griyo ak bannann', add: 'Ajoute',
    invalid: 'Koulè a pa valid (egz. #1e88e5)', admin: 'Se sèlman administratè a ki ka chanje koulè yo.',
  },
  fr: {
    title: 'Couleurs de votre restaurant', sub: 'Choisissez les couleurs de votre restaurant. Les pages Restaurant (tables, menu, commandes, rapports) et le portail client les adoptent.',
    fromLogo: 'Couleurs de votre logo', fromLogoSub: 'Cliquez sur une couleur pour en faire la couleur principale.', auto: 'Palette automatique', reading: 'Lecture du logo…',
    noLogo: 'Aucun logo. Ajoutez le logo de votre entreprise dans Paramètres pour en extraire les couleurs.', logoErr: 'Impossible de lire les couleurs du logo. Choisissez une palette ou vos couleurs.',
    presets: 'Palettes prêtes', custom: 'Vos couleurs', primary: 'Couleur principale', secondary: 'Couleur secondaire', match: 'Qui s’accordent',
    sidebar: 'Style du menu latéral', sDark: 'Noir classique', sBrand: 'Couleur de marque', sNight: 'Noir profond',
    portal: 'Portail client du restaurant', portalSub: 'Utiliser les mêmes couleurs sur les pages vues par vos clients.',
    preview: 'Aperçu', app: 'Pages Restaurant', phone: 'Portail client',
    save: 'Enregistrer', saving: 'Enregistrement…', saved: 'Couleurs enregistrées ! Les pages Restaurant et le portail ont changé.', reset: 'Revenir aux couleurs PLUS GROUP', resetDone: 'Couleurs PLUS GROUP rétablies.',
    unsaved: 'Vous avez des modifications non enregistrées.', current: 'Couleurs actuelles', defaultBadge: 'Couleurs PLUS GROUP',
    nLight: 'Couleur très claire : nous l’assombrissons automatiquement pour garder textes et boutons lisibles.',
    nDark: 'Couleur très foncée sur fond noir : nous l’éclaircissons automatiquement pour qu’elle reste visible.',
    nGray: 'Couleur grise/noire : l’application sera sobre. Une couleur secondaire vive lui donnera plus de vie.',
    nav: ['Menu', 'Tout', 'Plats', 'Boissons'], sales: 'Plats au menu', newInv: 'Nouveau plat', paid: 'Disponible', dish: 'Griot et bananes', add: 'Ajouter',
    invalid: 'Couleur invalide (ex. #1e88e5)', admin: 'Seul l’administrateur peut modifier les couleurs.',
  },
  en: {
    title: 'Your restaurant colors', sub: 'Pick your restaurant colors. The Restaurant pages (tables, menu, orders, reports) and the customer portal adopt them.',
    fromLogo: 'Colors from your logo', fromLogoSub: 'Click a color to make it the main color.', auto: 'Auto palette', reading: 'Reading the logo…',
    noLogo: 'No logo yet. Add your business logo in Settings to pull its colors.', logoErr: 'We couldn’t read the logo colors. Pick a palette or your own colors.',
    presets: 'Ready-made palettes', custom: 'Your own colors', primary: 'Main color', secondary: 'Second color', match: 'Goes well with it',
    sidebar: 'Side menu style', sDark: 'Classic black', sBrand: 'Brand color', sNight: 'Deep black',
    portal: 'Restaurant customer portal', portalSub: 'Use the same colors on the pages your customers see.',
    preview: 'Preview', app: 'Restaurant pages', phone: 'Customer portal',
    save: 'Save', saving: 'Saving…', saved: 'Colors saved! The Restaurant pages and the portal have changed.', reset: 'Back to PLUS GROUP colors', resetDone: 'PLUS GROUP colors restored.',
    unsaved: 'You have unsaved changes.', current: 'Current colors', defaultBadge: 'PLUS GROUP colors',
    nLight: 'This color is very light: we darken it automatically so text and buttons stay readable.',
    nDark: 'This color is very dark on black backgrounds: we lighten it automatically so it stays visible.',
    nGray: 'This is a gray/black color: the app will look sober. A vivid second color will bring it to life.',
    nav: ['Menu', 'All', 'Dishes', 'Drinks'], sales: 'Dishes on the menu', newInv: 'New dish', paid: 'Available', dish: 'Griot & plantains', add: 'Add',
    invalid: 'Invalid color (e.g. #1e88e5)', admin: 'Only the administrator can change the colors.',
  },
  es: {
    title: 'Colores de su restaurante', sub: 'Elija los colores de su restaurante. Las páginas de Restaurante (mesas, menú, pedidos, informes) y el portal de clientes los adoptan.',
    fromLogo: 'Colores de su logo', fromLogoSub: 'Haga clic en un color para usarlo como principal.', auto: 'Paleta automática', reading: 'Leyendo el logo…',
    noLogo: 'Sin logo. Agregue el logo de su negocio en Configuración para usar sus colores.', logoErr: 'No pudimos leer los colores del logo. Elija una paleta o sus colores.',
    presets: 'Paletas listas', custom: 'Sus colores', primary: 'Color principal', secondary: 'Segundo color', match: 'Combinan bien',
    sidebar: 'Estilo del menú lateral', sDark: 'Negro clásico', sBrand: 'Color de marca', sNight: 'Negro profundo',
    portal: 'Portal de clientes del restaurante', portalSub: 'Usar los mismos colores en las páginas que ven sus clientes.',
    preview: 'Vista previa', app: 'Páginas de Restaurante', phone: 'Portal de clientes',
    save: 'Guardar', saving: 'Guardando…', saved: '¡Colores guardados! Las páginas de Restaurante y el portal cambiaron.', reset: 'Volver a los colores PLUS GROUP', resetDone: 'Colores PLUS GROUP restaurados.',
    unsaved: 'Tiene cambios sin guardar.', current: 'Colores actuales', defaultBadge: 'Colores PLUS GROUP',
    nLight: 'Color muy claro: lo oscurecemos automáticamente para que textos y botones sean legibles.',
    nDark: 'Color muy oscuro sobre fondo negro: lo aclaramos automáticamente para que siga visible.',
    nGray: 'Es un color gris/negro: la app se verá sobria. Un segundo color vivo le dará más vida.',
    nav: ['Menú', 'Todo', 'Platos', 'Bebidas'], sales: 'Platos en el menú', newInv: 'Nuevo plato', paid: 'Disponible', dish: 'Griot con plátanos', add: 'Agregar',
    invalid: 'Color inválido (ej. #1e88e5)', admin: 'Solo el administrador puede cambiar los colores.',
  },
}

const PRESETS = [
  { id: 'plus', primary: '#f5680c', secondary: '#ff8534', sidebar: 'dark', name: { ht: 'PLUS Zoranj', fr: 'PLUS Orange', en: 'PLUS Orange', es: 'PLUS Naranja' } },
  { id: 'lakay', primary: '#c62828', secondary: '#f9a825', sidebar: 'brand', name: { ht: 'Wouj Lakay', fr: 'Rouge Lakay', en: 'Lakay Red', es: 'Rojo Lakay' } },
  { id: 'lanme', primary: '#1565c0', secondary: '#29b6f6', sidebar: 'brand', name: { ht: 'Ble Lanmè', fr: 'Bleu Océan', en: 'Ocean Blue', es: 'Azul Océano' } },
  { id: 'palmis', primary: '#2e7d32', secondary: '#c0ca33', sidebar: 'brand', name: { ht: 'Vèt Palmis', fr: 'Vert Palmier', en: 'Palm Green', es: 'Verde Palma' } },
  { id: 'wayal', primary: '#6a1b9a', secondary: '#ec407a', sidebar: 'brand', name: { ht: 'Violèt Wayal', fr: 'Violet Royal', en: 'Royal Purple', es: 'Violeta Real' } },
  { id: 'lo', primary: '#b8912f', secondary: '#e6c76a', sidebar: 'night', name: { ht: 'Lò ak Nwa', fr: 'Or et Noir', en: 'Gold & Black', es: 'Oro y Negro' } },
  { id: 'turkwaz', primary: '#00897b', secondary: '#4dd0e1', sidebar: 'dark', name: { ht: 'Turkwaz', fr: 'Turquoise', en: 'Teal', es: 'Turquesa' } },
  { id: 'kanpay', primary: '#d81b60', secondary: '#ff8a65', sidebar: 'dark', name: { ht: 'Woz Kanpay', fr: 'Rose Fête', en: 'Party Pink', es: 'Rosa Fiesta' } },
  { id: 'kafe', primary: '#6d4c41', secondary: '#d7a86e', sidebar: 'brand', name: { ht: 'Mawon Kafe', fr: 'Brun Café', en: 'Coffee Brown', es: 'Marrón Café' } },
  { id: 'nwit', primary: '#1e3a8a', secondary: '#f59e0b', sidebar: 'brand', name: { ht: 'Ble Nwit', fr: 'Bleu Nuit', en: 'Midnight Blue', es: 'Azul Noche' } },
]

const logoSrc = (url) => !url ? null : (url.startsWith('data:') || url.startsWith('http')) ? url : (url.startsWith('/') ? url : `/${url}`)
const safeJson = (v, fb) => { if (!v) return fb; if (typeof v === 'object') return v; try { return JSON.parse(v) } catch { return fb } }
const same = (a, b) => (a?.primary || '') === (b?.primary || '') && (a?.secondary || '') === (b?.secondary || '') && (a?.applyPortal !== false) === (b?.applyPortal !== false)

function ColorField({ label, value, onChange, tx }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const commit = () => { const h = normHex(text); if (h) onChange(h); else { toast.error(tx.invalid); setText(value) } }
  return (
    <label className="brd-color">
      <span className="brd-label">{label}</span>
      <span className="brd-color__row">
        <span className="brd-color__pick" style={{ background: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        </span>
        <input className="brd-input" value={text} maxLength={7} spellCheck={false}
          onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } }} />
      </span>
    </label>
  )
}

function Preview({ pal, tx, tenant, logo }) {
  const initial = (tenant?.name || 'R').charAt(0).toUpperCase()
  return (
    <div className="brd-pv" style={pal.vars}>
      <div className="brd-pv__cap"><UtensilsCrossed size={13} /> {tx.app}</div>
      <div className="brd-pv__rs">
        <div className="brd-pv__rs-hero">
          <span className="brd-pv__rs-logo">{logo ? <img src={logo} alt="" /> : initial}</span>
          <span className="brd-pv__rs-t"><small>{tenant?.name || 'Restoran'}</small><b>{tx.nav[0]}</b></span>
          <span className="brd-pv__rs-btn"><Plus size={12} /> {tx.newInv}</span>
        </div>
        <div className="brd-pv__rs-stat"><span className="brd-pv__rs-ic"><UtensilsCrossed size={13} /></span><span><b>45</b><small>{tx.sales}</small></span></div>
        <div className="brd-pv__rs-tools">
          <span className="brd-pv__rs-search"><Search size={11} /></span>
          {tx.nav.slice(1).map((c, i) => <span key={c} className={`brd-pv__rs-chip ${i === 0 ? 'on' : ''}`}>{c}</span>)}
        </div>
        <div className="brd-pv__rs-card"><span><b>{tx.dish}</b><em>{tx.paid}</em></span><strong>650 HTG</strong><i><Plus size={12} /></i></div>
      </div>
      <div className="brd-pv__cap" style={{ marginTop: 14 }}><Globe2 size={13} /> {tx.phone}</div>
      <div className="brd-pv__phone">
        <div className="brd-pv__ph-top"><span className="brd-pv__ph-logo">{logo ? <img src={logo} alt="" /> : initial}</span><b>{tenant?.name || 'Restoran'}</b></div>
        <div className="brd-pv__ph-promo" />
        <div className="brd-pv__ph-card"><span><b>{tx.dish}</b><small>650 HTG</small></span><em>+ {tx.add}</em></div>
      </div>
    </div>
  )
}

export default function RestaurantBrandingPage() {
  const { i18n } = useTranslation()
  const lang = (i18n.language || 'ht').slice(0, 2)
  const tx = T[lang] || T.ht
  const qc = useQueryClient()
  const { user, tenant } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true
  const logo = useMemo(() => logoSrc(tenant?.logoUrl), [tenant?.logoUrl])
  const portalOn = safeJson(tenant?.allowedPages, {})?.['restaurant-portal'] === true

  const { data: saved, isLoading } = useQuery({ queryKey: ['tenant-branding'], queryFn: brandingApi.get, staleTime: 30000 })
  const [form, setForm] = useState(DEFAULT_BRAND)
  const [touched, setTouched] = useState(false)
  useEffect(() => { if (!touched) setForm(saved ? { ...DEFAULT_BRAND, ...saved } : DEFAULT_BRAND) }, [saved, touched])
  const set = (patch) => { setTouched(true); setForm((f) => ({ ...f, ...patch })) }

  // Koulè logo a
  const [logoColors, setLogoColors] = useState([])
  const [logoState, setLogoState] = useState(logo ? 'loading' : 'none')
  useEffect(() => {
    let on = true
    if (!logo) { setLogoState('none'); return undefined }
    setLogoState('loading')
    extractLogoColors(logo).then((c) => { if (!on) return; setLogoColors(c); setLogoState(c.length ? 'ok' : 'err') }).catch(() => on && setLogoState('err'))
    return () => { on = false }
  }, [logo])

  const pal = useMemo(() => buildPalette(form), [form])
  const matches = useMemo(() => matchingColors(form.primary), [form.primary])
  const dirty = touched && !same(form, saved || DEFAULT_BRAND)

  const autoFromLogo = () => {
    if (!logoColors.length) return
    const vivid = logoColors.filter((c) => contrast(c, '#ffffff') > 1.25 && contrast(c, '#000000') > 1.6)
    const primary = vivid[0] || logoColors[0]
    const secondary = vivid.find((c) => c !== primary) || matchingColors(primary)[0].color
    set({ primary, secondary })
  }

  const save = useMutation({
    mutationFn: () => brandingApi.save({ primary: pal.primary, secondary: pal.secondary, sidebar: 'dark', applyPortal: form.applyPortal !== false }),
    onSuccess: (b) => { publishBrand(tenant?.id, b); qc.setQueryData(['tenant-branding'], b); setTouched(false); toast.success(tx.saved) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè'),
  })
  const reset = useMutation({
    mutationFn: brandingApi.reset,
    onSuccess: () => { publishBrand(tenant?.id, null); qc.setQueryData(['tenant-branding'], null); setTouched(false); setForm(DEFAULT_BRAND); toast.success(tx.resetDone) },
    onError: (e) => toast.error(e.response?.data?.message || 'Erè'),
  })

  const presetOn = (p) => p.primary === form.primary && p.secondary === (form.secondary || pal.secondary)

  return (
    <div className="brd">
      <header className="brd-hero">
        <span className="brd-hero__ic"><Palette size={22} /></span>
        <div style={{ minWidth: 0 }}>
          <h1>{tx.title}</h1>
          <p>{tx.sub}</p>
        </div>
        <span className="brd-hero__now" title={tx.current}>
          <i style={{ background: saved?.primary || DEFAULT_BRAND.primary }} /><i style={{ background: saved?.secondary || DEFAULT_BRAND.secondary }} />
          {saved ? tx.current : tx.defaultBadge}
        </span>
      </header>

      {!isAdmin && <div className="brd-note"><AlertTriangle size={16} /> {tx.admin}</div>}

      <div className="brd-grid">
        <div className="brd-col">
          {/* 1. Logo */}
          <section className="brd-card">
            <div className="brd-card__head">
              <h2><Wand2 size={17} /> {tx.fromLogo}</h2>
              {logoState === 'ok' && <button type="button" className="brd-btn brd-btn--soft" onClick={autoFromLogo} disabled={!isAdmin}><Wand2 size={15} /> {tx.auto}</button>}
            </div>
            <div className="brd-logo">
              <span className="brd-logo__img">{logo ? <img src={logo} alt="logo" /> : <ImageOff size={22} />}</span>
              <div className="brd-logo__body">
                {logoState === 'loading' && <p className="brd-muted"><Loader2 size={14} className="brd-spin" /> {tx.reading}</p>}
                {logoState === 'none' && <p className="brd-muted">{tx.noLogo}</p>}
                {logoState === 'err' && <p className="brd-muted">{tx.logoErr}</p>}
                {logoState === 'ok' && (
                  <>
                    <p className="brd-muted">{tx.fromLogoSub}</p>
                    <div className="brd-swatches">
                      {logoColors.map((c) => (
                        <button key={c} type="button" className={`brd-sw ${form.primary === c ? 'on' : ''}`} style={{ background: c }} onClick={() => set({ primary: c })} disabled={!isAdmin} title={c} aria-label={c}>
                          {form.primary === c && <Check size={14} color={pal.vars['--on-brand']} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* 2. Palèt pare */}
          <section className="brd-card">
            <h2><Palette size={17} /> {tx.presets}</h2>
            <div className="brd-presets">
              {PRESETS.map((p) => {
                return (
                  <button key={p.id} type="button" className={`brd-preset ${presetOn(p) ? 'on' : ''}`} disabled={!isAdmin}
                    onClick={() => set({ primary: p.primary, secondary: p.secondary })}>
                    <span className="brd-preset__mock">
                      <i style={{ background: p.primary }} /><i style={{ background: p.secondary }} />
                    </span>
                    <span className="brd-preset__nm">{p.name[lang] || p.name.ht}</span>
                    {presetOn(p) && <span className="brd-preset__ok"><Check size={12} /></span>}
                  </button>
                )
              })}
            </div>
          </section>

          {/* 3. Koulè pa w */}
          <section className="brd-card">
            <h2>{tx.custom}</h2>
            <div className="brd-colors">
              <ColorField label={tx.primary} value={pal.primary} tx={tx} onChange={(c) => set({ primary: c })} />
              <ColorField label={tx.secondary} value={pal.secondary} tx={tx} onChange={(c) => set({ secondary: c })} />
            </div>
            <span className="brd-label" style={{ marginTop: 14, display: 'block' }}>{tx.match}</span>
            <div className="brd-swatches">
              {matches.map((m) => (
                <button key={m.id} type="button" className={`brd-sw brd-sw--sm ${pal.secondary === m.color ? 'on' : ''}`} style={{ background: m.color }} disabled={!isAdmin}
                  onClick={() => set({ secondary: m.color })} title={m.color} aria-label={m.color}>
                  {pal.secondary === m.color && <Check size={12} color="#fff" />}
                </button>
              ))}
            </div>
            {pal.notes.map((n) => <div key={n} className="brd-note brd-note--soft"><AlertTriangle size={15} /> {tx[`n${n[0].toUpperCase()}${n.slice(1)}`]}</div>)}
          </section>

          {/* 5. Pòtal */}
          {portalOn && (
            <section className="brd-card">
              <label className="brd-switch">
                <span><b><Globe2 size={15} /> {tx.portal}</b><small>{tx.portalSub}</small></span>
                <input type="checkbox" checked={form.applyPortal !== false} onChange={(e) => set({ applyPortal: e.target.checked })} disabled={!isAdmin} />
                <i aria-hidden="true" />
              </label>
            </section>
          )}
        </div>

        <div className="brd-side-col">
          <div className="brd-sticky">
            <h2 className="brd-pv-title">{tx.preview}</h2>
            {isLoading ? <div className="brd-skel" /> : <Preview pal={pal} tx={tx} tenant={tenant} logo={logo} />}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className={`brd-actions ${dirty ? 'is-dirty' : ''}`}>
          {dirty && <span className="brd-actions__msg">{tx.unsaved}</span>}
          <button type="button" className="brd-btn brd-btn--ghost" onClick={() => reset.mutate()} disabled={reset.isPending || (!saved && !dirty)}>
            <RotateCcw size={15} /> <span>{tx.reset}</span>
          </button>
          <button type="button" className="brd-btn brd-btn--primary" style={{ background: pal.primary, color: pal.vars['--on-brand'] }}
            onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
            {save.isPending ? <Loader2 size={16} className="brd-spin" /> : <Save size={16} />} {save.isPending ? tx.saving : tx.save}
          </button>
        </div>
      )}
    </div>
  )
}