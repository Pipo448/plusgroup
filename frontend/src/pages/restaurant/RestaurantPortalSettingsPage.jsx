// src/pages/restaurant/RestaurantPortalSettingsPage.jsx
// ─── Paramèt pòtal kliyan an (admin) ──────────────────────────────────
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Globe, Copy, ExternalLink, Store, ShoppingBag, CalendarDays, Wallet, Plus, X, Check, MapPin, LocateFixed, Compass } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useRT } from './restoI18n'
import { restoApi, portalUrl, directoryUrl } from './restoApi'
import RestoQrCard from './RestoQrCard'
import { Stage, Hero, Btn, Badge, Switch, Field, ThemeToggle, SkeletonGrid, PhoneFrame, useRestoTheme, useIsMobile, getTenantName } from './restoUI'

const liveSlug = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').slice(0, 60)
const slugify = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export default function RestaurantPortalSettingsPage() {
  const { t } = useRT()
  const [theme, toggleTheme] = useRestoTheme()
  const { tenant } = useAuthStore()
  const tenantName = getTenantName(tenant)
  const qc = useQueryClient()
  const [f, setF] = useState(null)
  const [newSlot, setNewSlot] = useState('')
  const [copied, setCopied] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const isMobile = useIsMobile(900)

  const { data, isLoading } = useQuery({ queryKey: ['restaurant-portal-settings'], queryFn: restoApi.portalSettings })
  useEffect(() => { if (data?.settings && !f) setF(data.settings) }, [data, f])

  const save = useMutation({
    mutationFn: () => restoApi.savePortalSettings({ ...f, enabled: data?.settings?.allowed === false ? false : f.enabled, slug: slugify(f.slug) }),
    onSuccess: (res) => { setF(res.settings); setReloadKey((k) => k + 1); qc.setQueryData(['restaurant-portal-settings'], (o) => ({ ...(o || {}), settings: res.settings })); toast.success(t('portal.saved')) },
    onError: (e) => { const c = e.response?.data?.code; toast.error(c && t(`portal.errors.${c}`) !== `resto.portal.errors.${c}` ? t(`portal.errors.${c}`) : e.response?.data?.message || t('common.error')) },
  })

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v?.target ? v.target.value : v }))
  const togglePay = (m) => setF((s) => {
    const has = s.paymentMethods.includes(m)
    const next = has ? s.paymentMethods.filter((x) => x !== m) : [...s.paymentMethods, m]
    return { ...s, paymentMethods: next.length ? next : ['cash'] }
  })
  const addSlot = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newSlot)) return
    setF((s) => ({ ...s, reservationSlots: [...new Set([...s.reservationSlots, newSlot])].sort() })); setNewSlot('')
  }

  // Pozisyon restoran an pou anyè Plus Resto (kliyan yo wè distans lan)
  const [locating, setLocating] = useState(false)
  const locateMe = () => {
    if (!navigator.geolocation) { toast.error(t('dir.posErr')); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (g) => { setLocating(false); setF((s) => ({ ...s, latitude: Math.round(g.coords.latitude * 1e6) / 1e6, longitude: Math.round(g.coords.longitude * 1e6) / 1e6 })); toast.success(t('dir.posSet')) },
      () => { setLocating(false); toast.error(t('dir.posErr')) },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }
  const hasPos = f && f.latitude != null && f.longitude != null && f.latitude !== '' && f.longitude !== ''

  const url = f ? portalUrl(slugify(f.slug)) : ''
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* */ } }

  return (
    <Stage theme={theme} className="rs-page">
      <div className="rs-wrap" style={{ maxWidth: 1000 }}>
        <Hero overline={tenantName} title={t('portal.title')} subtitle={t('portal.subtitle')} icon={Globe}
          actions={<>
            <ThemeToggle theme={theme} onToggle={toggleTheme} t={t} />
            <Btn icon={Check} loading={save.isPending} disabled={!f} onClick={() => save.mutate()}>{t('common.save')}</Btn>
          </>} />

        {isLoading || !f ? <SkeletonGrid count={4} height={180} className="rs-two" /> : (
          <div className="rs-col" style={{ gap: 18 }}>
            <div className="rs-two" style={{ alignItems: 'center' }}>
            <section className="rs-card rs-glass">
              {data?.settings?.allowed === false && (
                <div className="rs-alert rs-alert--warn" style={{ marginBottom: 12, flexDirection: 'column', gap: 4 }}>
                  <b>{t('portal.notAllowedTitle')}</b><span>{t('portal.notAllowedText')}</span>
                </div>
              )}
              <Switch on={f.enabled && data?.settings?.allowed !== false} onChange={set('enabled')} title={t('portal.enabled')} desc={t('portal.enabledDesc')} disabled={data?.settings?.allowed === false} />
              <div className="rs-form" style={{ marginTop: 14 }}>
                <Field label={t('portal.slug')} hint={t('portal.slugHint', { example: slugify(tenantName) || 'chez-marie' })}>
                  <input className="rs-input" value={f.slug} onChange={(e) => set('slug')(liveSlug(e.target.value))} />
                </Field>
                <Field label={t('portal.link')} hint={!data?.settings?.exists ? t('portal.notSaved') : null}>
                  <div className="rs-link-box">
                    <code>{url}</code>
                    <Btn variant="glass" size="sm" icon={copied ? Check : Copy} onClick={copy}>{copied ? t('common.copied') : t('common.copy')}</Btn>
                    <a className="rs-btn rs-btn--primary rs-btn--sm" href={url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> {t('portal.preview')}</a>
                  </div>
                </Field>
                {f.enabled ? <Badge tone="basil" dot pulse>{t('portal.enabled')}</Badge> : null}
              </div>
            </section>
            {!isMobile && (
              <section className="rs-preview" aria-label={t('portal.livePreview')}>
                <span className="rs-overline">{t('portal.livePreview')}</span>
                <PhoneFrame width={280} tilt="hero">
                  {data?.settings?.exists && data?.settings?.enabled
                    ? <iframe key={reloadKey} title={t('portal.livePreview')} src={`${window.location.origin}/resto/${data.settings.slug}`} style={{ width: 390, height: 860, transform: 'scale(0.667)' }} loading="lazy" />
                    : <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}><Globe size={42} style={{ color: 'var(--paprika-ink)' }} /></div>}
                </PhoneFrame>
                <p className="rs-hint" style={{ textAlign: 'center', maxWidth: 280, margin: 0 }}>{t('portal.previewHint')}</p>
              </section>
            )}
            </div>

            {/* ✅ NOUVO — Kòd QR pou tab yo / vitrin nan / WhatsApp */}
            <RestoQrCard t={t} portalUrl={url} directoryUrl={directoryUrl()} tenantName={tenantName} slug={slugify(f.slug)}
              ready={!!data?.settings?.exists && !!data?.settings?.enabled && data?.settings?.allowed !== false && slugify(f.slug) === data?.settings?.slug} />

            {/* ✅ NOUVO — Anyè Plus Resto: restoran toupre kliyan an */}
            <section className="rs-card rs-glass" style={{ '--delay': '40ms' }}>
              <h2 className="rs-card__title"><Compass size={18} /> {t('dir.sTitle')}</h2>
              <p className="rs-hint" style={{ marginTop: -6 }}>{t('dir.sDesc')}</p>
              <div className="rs-form">
                <Switch on={f.listed !== false} onChange={set('listed')} title={t('dir.listed')} desc={t('dir.listedDesc')} />
                <div className="rs-form-grid">
                  <Field label={t('dir.city')}><input className="rs-input" value={f.city || ''} onChange={set('city')} placeholder="Ouanaminthe" maxLength={60} /></Field>
                  <Field label={t('dir.cuisine')} hint={t('dir.cuisineHint')}><input className="rs-input" value={f.cuisine || ''} onChange={set('cuisine')} maxLength={80} /></Field>
                </div>
                <Field label={t('dir.position')} hint={t('dir.posHint')}>
                  <div className="rs-geo">
                    <Btn variant={hasPos ? 'glass' : 'primary'} icon={LocateFixed} loading={locating} onClick={locateMe}>{t('dir.useMyPos')}</Btn>
                    {hasPos
                      ? <a className="rs-geo__pin" href={`https://www.openstreetmap.org/?mlat=${f.latitude}&mlon=${f.longitude}#map=17/${f.latitude}/${f.longitude}`} target="_blank" rel="noreferrer">
                          <MapPin size={15} /> {Number(f.latitude).toFixed(5)}, {Number(f.longitude).toFixed(5)} · {t('dir.seeMap')} <ExternalLink size={13} />
                        </a>
                      : <Badge tone="saffron">{t('dir.posMissing')}</Badge>}
                  </div>
                </Field>
                <div className="rs-form-grid">
                  <Field label={t('dir.lat')}><input className="rs-input rs-mono" inputMode="decimal" value={f.latitude ?? ''} onChange={set('latitude')} placeholder="19.5501" /></Field>
                  <Field label={t('dir.lng')}><input className="rs-input rs-mono" inputMode="decimal" value={f.longitude ?? ''} onChange={set('longitude')} placeholder="-71.7243" /></Field>
                </div>
                <Field label={t('dir.directoryLink')}>
                  <div className="rs-link-box"><code>{directoryUrl()}</code>
                    <Btn size="sm" variant="glass" icon={ExternalLink} onClick={() => window.open(directoryUrl(), '_blank', 'noopener')} aria-label={t('dir.directoryLink')} />
                  </div>
                </Field>
              </div>
            </section>

            <div className="rs-two">
              <section className="rs-card rs-glass" style={{ '--delay': '60ms' }}>
                <h2 className="rs-card__title"><Store size={18} /> {t('portal.sections.general')}</h2>
                <div className="rs-form">
                  <div className="rs-form-grid">
                    <Field label={t('portal.phone')}><input className="rs-input" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
                    <Field label={t('portal.whatsapp')}><input className="rs-input" inputMode="tel" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
                  </div>
                  <Field label={t('portal.address')}><input className="rs-input" value={f.address} onChange={set('address')} /></Field>
                  <Field label={t('portal.hours')}><input className="rs-input" value={f.hoursText} onChange={set('hoursText')} placeholder={t('portal.hoursPh')} /></Field>
                  <Field label={t('portal.welcome')}><textarea className="rs-textarea" rows={2} value={f.welcomeMessage} onChange={set('welcomeMessage')} placeholder={t('portal.welcomePh')} /></Field>
                </div>
              </section>

              <section className="rs-card rs-glass" style={{ '--delay': '120ms' }}>
                <h2 className="rs-card__title"><ShoppingBag size={18} /> {t('portal.sections.orders')}</h2>
                <div className="rs-form">
                  <Switch on={f.acceptOrders} onChange={set('acceptOrders')} title={t('portal.acceptOrders')} desc={t('portal.acceptOrdersDesc')} />
                  <Switch on={f.acceptingNow} onChange={set('acceptingNow')} title={t('portal.acceptingNow')} desc={t('portal.acceptingNowDesc')} disabled={!f.acceptOrders} />
                  <Switch on={f.deliveryEnabled} onChange={set('deliveryEnabled')} title={t('portal.delivery')} desc={t('portal.deliveryDesc')} disabled={!f.acceptOrders} />
                  <Switch on={f.pickupEnabled} onChange={set('pickupEnabled')} title={t('portal.pickup')} desc={t('portal.pickupDesc')} disabled={!f.acceptOrders} />
                  <div className="rs-form-grid">
                    <Field label={t('portal.deliveryFee')}><input type="number" min="0" className="rs-input rs-mono" value={f.deliveryFeeHtg} onChange={set('deliveryFeeHtg')} /></Field>
                    <Field label={t('portal.minOrder')}><input type="number" min="0" className="rs-input rs-mono" value={f.minOrderHtg} onChange={set('minOrderHtg')} /></Field>
                  </div>
                  <Field label={t('portal.prepMinutes')}><input type="number" min="5" max="240" className="rs-input rs-mono" value={f.prepMinutes} onChange={set('prepMinutes')} /></Field>
                </div>
              </section>

              <section className="rs-card rs-glass" style={{ '--delay': '180ms' }}>
                <h2 className="rs-card__title"><Wallet size={18} /> {t('portal.sections.payment')}</h2>
                <div className="rs-form">
                  <span className="rs-label">{t('portal.payments')}</span>
                  {['cash', 'moncash', 'natcash'].map((m) => (
                    <Switch key={m} on={f.paymentMethods.includes(m)} onChange={() => togglePay(m)} title={t(`orders.payment.${m}`)} />
                  ))}
                  {f.paymentMethods.some((m) => m !== 'cash') && (
                    <Field label={t('portal.moncashNumber')}><input className="rs-input" inputMode="tel" value={f.moncashNumber} onChange={set('moncashNumber')} /></Field>
                  )}
                </div>
              </section>

              <section className="rs-card rs-glass" style={{ '--delay': '240ms' }}>
                <h2 className="rs-card__title"><CalendarDays size={18} /> {t('portal.sections.reservations')}</h2>
                <div className="rs-form">
                  <Switch on={f.acceptReservations} onChange={set('acceptReservations')} title={t('portal.acceptResv')} desc={t('portal.acceptResvDesc')} />
                  <Field label={t('portal.slots')} hint={t('portal.slotsHint')}>
                    <div className="rs-slots">
                      {f.reservationSlots.map((s) => (
                        <button key={s} type="button" className="rs-slot" onClick={() => setF((x) => ({ ...x, reservationSlots: x.reservationSlots.filter((y) => y !== s) }))}>
                          {s} <X size={11} style={{ verticalAlign: -1 }} />
                        </button>
                      ))}
                    </div>
                  </Field>
                  <div className="rs-row" style={{ flexWrap: 'nowrap' }}>
                    <input type="time" className="rs-input" value={newSlot} onChange={(e) => setNewSlot(e.target.value)} />
                    <Btn variant="glass" icon={Plus} onClick={addSlot} disabled={!newSlot}>{t('portal.addSlot')}</Btn>
                  </div>
                  <div className="rs-form-grid">
                    <Field label={t('portal.slotCapacity')}><input type="number" min="1" className="rs-input rs-mono" value={f.slotCapacity} onChange={set('slotCapacity')} /></Field>
                    <Field label={t('portal.maxParty')}><input type="number" min="1" className="rs-input rs-mono" value={f.maxParty} onChange={set('maxParty')} /></Field>
                  </div>
                </div>
              </section>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn size="lg" icon={Check} loading={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Btn>
            </div>
          </div>
        )}
      </div>
    </Stage>
  )
}