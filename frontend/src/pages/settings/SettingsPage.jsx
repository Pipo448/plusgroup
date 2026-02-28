// src/pages/settings/SettingsPage.jsx
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings, Users, DollarSign, Upload, Save, RefreshCw, ArrowUpDown, Building2, Palette, Printer, Bluetooth, Usb, Wifi, Eye, EyeOff, QrCode } from 'lucide-react'

const D = {
  blue:'#1B2A8F', blueLt:'#2D3FBF', blueDk:'#0F1A5C',
  blueDim:'rgba(27,42,143,0.07)', blueDim2:'rgba(27,42,143,0.13)',
  gold:'#C9A84C', goldDk:'#8B6914',
  white:'#FFFFFF', bg:'#F4F6FF', border:'rgba(27,42,143,0.10)',
  text:'#0F1A5C', muted:'#6B7AAB',
  shadow:'0 4px 20px rgba(27,42,143,0.10)',
}

const inp = {
  width:'100%', padding:'10px 14px', borderRadius:10,
  border:`1.5px solid ${D.border}`, outline:'none',
  fontSize:13, color:D.text, background:'#F8F9FF',
  fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
  transition:'border-color 0.2s',
}

const CURRENCIES = [
  { value:'USD', label:'USD — Dola Ameriken',  flag:'🇺🇸', symbol:'$'   },
  { value:'DOP', label:'DOP — Peso Dominiken', flag:'🇩🇴', symbol:'RD$' },
  { value:'EUR', label:'EUR — Euro',            flag:'🇪🇺', symbol:'€'   },
  { value:'CAD', label:'CAD — Dola Kanadyen',  flag:'🇨🇦', symbol:'CA$' },
]

function Toggle({ checked, onChange, color = D.blue }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      width:44, height:24, borderRadius:12, padding:2,
      background: checked ? color : '#CBD5E1',
      border:'none', cursor:'pointer', transition:'background 0.2s',
      display:'flex', alignItems:'center', flexShrink:0,
    }}>
      <div style={{
        width:20, height:20, borderRadius:'50%', background:'#fff',
        boxShadow:'0 1px 4px rgba(0,0,0,0.2)',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition:'transform 0.2s',
      }} />
    </button>
  )
}

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { updateTenant } = useAuthStore()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [printerConn, setPrinterConn] = useState('usb')
  const [rates, setRates] = useState({ USD:'', DOP:'', EUR:'', CAD:'' })
  const [showRates, setShowRates] = useState({ USD:true, DOP:false, EUR:false, CAD:false })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantAPI.getSettings().then(r => r.data.tenant)
  })

  const { register, handleSubmit, reset, watch, setValue } = useForm()

  useEffect(() => {
    if (settings) {
      reset({
        name:              settings.name              || '',
        email:             settings.email             || '',
        phone:             settings.phone             || '',
        address:           settings.address           || '',
        primaryColor:      settings.primaryColor      || '#1B2A8F',
        taxRate:           settings.taxRate           || 0,
        defaultLanguage:   settings.defaultLanguage   || 'ht',
        defaultCurrency:   settings.defaultCurrency   || 'HTG',
        receiptSize:       settings.receiptSize       || '80mm',
        printerConnection: settings.printerConnection || 'usb',
        showExchangeRate:  settings.showExchangeRate  !== false,
        showQrCode:        settings.showQrCode        !== false, // ← defò: true
      })
      setPrinterConn(settings.printerConnection || 'usb')
      if (settings.exchangeRates) {
        setRates(r => ({ ...r, ...settings.exchangeRates }))
      } else if (settings.exchangeRate) {
        setRates(r => ({ ...r, USD: String(settings.exchangeRate) }))
      }
      if (settings.visibleCurrencies) {
        const vis = {}
        CURRENCIES.forEach(c => { vis[c.value] = settings.visibleCurrencies.includes(c.value) })
        setShowRates(vis)
      }
    }
  }, [settings, reset])

  const handleLangChange = (e) => {
    const lang = e.target.value
    setValue('defaultLanguage', lang)
    i18n.changeLanguage(lang)
    localStorage.setItem('plusgroup-lang', lang)
  }

  const updateMutation = useMutation({
    mutationFn: (data) => tenantAPI.updateSettings(data),
    onSuccess: (res) => {
      const updated = res.data.tenant
      updateTenant({ ...settings, ...updated })
      qc.setQueryData(['tenant-settings'], old => ({ ...old, ...updated }))
      toast.success(t('settings.saved'))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error'))
  })

  const printerMutation = useMutation({
    mutationFn: (conn) => tenantAPI.updateSettings({ printerConnection: conn }),
    onSuccess: (res, conn) => {
      updateTenant({ ...settings, printerConnection: conn })
      qc.setQueryData(['tenant-settings'], old => ({ ...old, printerConnection: conn }))
      toast.success(`${t('settings.printerUpdated')}: ${conn}`)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error'))
  })

  const rateMutation = useMutation({
    mutationFn: ({ currency, rate }) => tenantAPI.updateSettings({
      exchangeRates: { ...rates, [currency]: rate },
      ...(currency === 'USD' ? { exchangeRate: rate } : {}),
    }),
    onSuccess: (res, { currency, rate }) => {
      const newRates = { ...rates, [currency]: String(rate) }
      setRates(newRates)
      updateTenant({ ...settings, exchangeRates: newRates, exchangeRate: currency === 'USD' ? rate : (settings?.exchangeRate || 0) })
      qc.setQueryData(['tenant-settings'], old => ({ ...old, exchangeRates: newRates }))
      toast.success(`${t('settings.rateUpdated')} ${currency}: 1 ${currency} = ${rate} HTG`)
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error'))
  })

  const visibilityMutation = useMutation({
    mutationFn: (visible) => tenantAPI.updateSettings({ visibleCurrencies: visible }),
    onSuccess: (res, visible) => {
      updateTenant({ ...settings, visibleCurrencies: visible })
      qc.setQueryData(['tenant-settings'], old => ({ ...old, visibleCurrencies: visible }))
      toast.success(t('settings.visibilityUpdated'))
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error'))
  })

  const handleToggleVisibility = (currency, newVal) => {
    const updated = { ...showRates, [currency]: newVal }
    setShowRates(updated)
    visibilityMutation.mutate(Object.entries(updated).filter(([, v]) => v).map(([k]) => k))
  }

  const TABS = [
    { key:'general',  label:t('settings.tabs.general'),  icon:<Building2 size={15}/> },
    { key:'printer',  label:t('settings.tabs.printer'),  icon:<Printer size={15}/> },
    { key:'currency', label:t('settings.tabs.currency'), icon:<DollarSign size={15}/> },
    { key:'users',    label:t('settings.tabs.users'),    icon:<Users size={15}/> },
  ]

  const PRINTER_OPTIONS = [
    { value:'bluetooth', label:t('settings.printer.bluetooth'), desc:t('settings.printer.bluetoothDesc'), icon:<Bluetooth size={22}/>, color:'#2563EB', bg:'rgba(37,99,235,0.08)' },
    { value:'usb',       label:t('settings.printer.usb'),       desc:t('settings.printer.usbDesc'),       icon:<Usb size={22}/>,       color:'#059669', bg:'rgba(5,150,105,0.08)'  },
    { value:'wifi',      label:t('settings.printer.wifi'),      desc:t('settings.printer.wifiDesc'),      icon:<Wifi size={22}/>,      color:'#7C3AED', bg:'rgba(124,58,237,0.08)' },
  ]

  if (isLoading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'80px 0' }}>
      <div style={{ width:36, height:36, border:`3px solid ${D.blueDim2}`, borderTopColor:D.blue, borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  )

  const primaryColor = watch('primaryColor') || D.blue
  const showExchangeRate = watch('showExchangeRate')
  const showQrCode = watch('showQrCode')

  return (
    <div style={{ fontFamily:'DM Sans,sans-serif', maxWidth:760 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:28 }}>
        <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 16px ${D.blue}40` }}>
          <Settings size={22} color="#fff" />
        </div>
        <div>
          <h1 style={{ color:D.text, fontSize:22, fontWeight:900, margin:0 }}>{t('settings.title')}</h1>
          <p style={{ color:D.muted, fontSize:13, margin:'2px 0 0' }}>{settings?.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'#EEF0FF', padding:5, borderRadius:14, width:'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10,
            fontSize:13, fontWeight:700, cursor:'pointer', transition:'all 0.2s', fontFamily:'DM Sans,sans-serif',
            background: activeTab===tab.key ? D.white : 'transparent',
            color: activeTab===tab.key ? D.blue : D.muted,
            boxShadow: activeTab===tab.key ? D.shadow : 'none',
            border:'none',
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══ JENERAL ══ */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:14, borderBottom:`1px solid ${D.border}` }}>
              <div style={{ width:32, height:32, borderRadius:9, background:D.blueDim2, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Building2 size={16} color={D.blue} />
              </div>
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>{t('settings.companyInfo')}</h3>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('settings.companyName')} *</label>
                <input style={inp} {...register('name',{required:true})} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border} />
              </div>

              {[
                { label:t('common.email'), key:'email', type:'email' },
                { label:t('common.phone'), key:'phone', type:'text'  },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{f.label}</label>
                  <input type={f.type} style={inp} {...register(f.key)} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border} />
                </div>
              ))}

              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('common.address')}</label>
                <input style={inp} {...register('address')} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border} />
              </div>

              <div>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('settings.taxRate')}</label>
                <input type="number" step="0.5" min="0" max="100" style={inp} {...register('taxRate')} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border} />
              </div>

              <div>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('settings.defaultLanguage')}</label>
                <select style={inp} {...register('defaultLanguage')} onChange={handleLangChange}>
                  <option value="ht">🇭🇹 Kreyòl Ayisyen</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇺🇸 English</option>
                </select>
              </div>

              <div>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('settings.defaultCurrency')}</label>
                <select style={inp} {...register('defaultCurrency')}>
                  <option value="HTG">HTG — Goud Ayisyen</option>
                  <option value="USD">USD — Dola Ameriken</option>
                  <option value="DOP">DOP — Peso Dominiken</option>
                </select>
              </div>

              <div>
                <label style={{ display:'block', color:D.muted, fontSize:12, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t('settings.receiptThermal')}</label>
                <select style={inp} {...register('receiptSize')}>
                  <option value="80mm">{t('settings.receipt80mm')}</option>
                  <option value="57mm">{t('settings.receipt57mm')}</option>
                </select>
              </div>

              {/* ── Toggle: Montre Taux sou Resi */}
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'14px 18px', borderRadius:12,
                  background: showExchangeRate ? 'rgba(27,42,143,0.06)' : '#f8f9ff',
                  border:`1.5px solid ${showExchangeRate ? D.border : '#e2e8f0'}`,
                  transition:'all 0.2s',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:showExchangeRate?D.blueDim2:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {showExchangeRate ? <Eye size={16} color={D.blue}/> : <EyeOff size={16} color={D.muted}/>}
                    </div>
                    <div>
                      <p style={{ fontWeight:800, fontSize:13, color:showExchangeRate?D.text:D.muted, margin:'0 0 2px' }}>{t('settings.showExchangeRate')}</p>
                      <p style={{ fontSize:11, color:D.muted, margin:0 }}>
                        {showExchangeRate ? t('settings.showExchangeRateOn') : t('settings.showExchangeRateOff')}
                      </p>
                    </div>
                  </div>
                  <Toggle checked={!!showExchangeRate} onChange={val => setValue('showExchangeRate', val)} color={D.blue} />
                </div>
              </div>

              {/* ── Toggle: Afiche QR Code sou Resi ── */}
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'14px 18px', borderRadius:12,
                  background: showQrCode ? 'rgba(27,42,143,0.06)' : '#f8f9ff',
                  border:`1.5px solid ${showQrCode ? D.border : '#e2e8f0'}`,
                  transition:'all 0.2s',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:showQrCode?D.blueDim2:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <QrCode size={16} color={showQrCode ? D.blue : D.muted}/>
                    </div>
                    <div>
                      <p style={{ fontWeight:800, fontSize:13, color:showQrCode?D.text:D.muted, margin:'0 0 2px' }}>
                        {t('settings.showQrCode')}
                      </p>
                      <p style={{ fontSize:11, color:D.muted, margin:0 }}>
                        {showQrCode ? t('settings.showQrCodeOn') : t('settings.showQrCodeOff')}
                      </p>
                    </div>
                  </div>
                  <Toggle checked={!!showQrCode} onChange={val => setValue('showQrCode', val)} color={D.blue} />
                </div>
              </div>

            </div>
          </div>

          {/* Koulè + Logo */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:D.white, borderRadius:16, padding:22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <Palette size={16} color={D.blue} />
                <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>{t('settings.primaryColor')}</h3>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:48, height:48, borderRadius:12, background:primaryColor, flexShrink:0, boxShadow:`0 4px 14px ${primaryColor}50` }} />
                <div style={{ flex:1 }}>
                  <input style={{ ...inp, fontFamily:'monospace', marginBottom:8 }} placeholder="#1B2A8F" {...register('primaryColor')} onFocus={e=>e.target.style.borderColor=D.blue} onBlur={e=>e.target.style.borderColor=D.border} />
                  <input type="color" value={primaryColor} onChange={e => setValue('primaryColor', e.target.value)} style={{ width:'100%', height:36, borderRadius:8, cursor:'pointer', border:`1px solid ${D.border}`, padding:3 }} />
                </div>
              </div>
            </div>

            <div style={{ background:D.white, borderRadius:16, padding:22, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <Upload size={16} color={D.blue} />
                <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>{t('settings.logo')}</h3>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                {settings?.logoUrl
                  ? <img src={settings.logoUrl} alt="logo" style={{ width:56, height:56, borderRadius:12, objectFit:'contain', border:`1px solid ${D.border}`, padding:4, background:'#f8f9ff' }} onError={e=>{e.target.style.display='none'}} />
                  : <div style={{ width:56, height:56, borderRadius:12, background:D.blueDim2, display:'flex', alignItems:'center', justifyContent:'center', color:D.blue, fontWeight:900, fontSize:20 }}>{settings?.name?.charAt(0)}</div>
                }
                <div>
                  <label style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:D.blueDim, color:D.blue, fontWeight:700, fontSize:12, cursor:'pointer', border:`1px solid ${D.border}` }}>
                    <Upload size={14} /> {t('settings.chooseLogo')}
                    <input type="file" accept="image/*" style={{ display:'none' }} onChange={async e => {
                      const file = e.target.files[0]; if (!file) return
                      const fd = new FormData(); fd.append('logo', file)
                      try {
                        const res = await tenantAPI.uploadLogo(fd)
                        updateTenant({ ...settings, logoUrl: res.data.logoUrl })
                        qc.setQueryData(['tenant-settings'], old => ({ ...old, logoUrl: res.data.logoUrl }))
                        toast.success(t('settings.logoUpdated'))
                      } catch { toast.error(t('settings.logoError')) }
                    }} />
                  </label>
                  <p style={{ fontSize:11, color:D.muted, marginTop:6 }}>PNG, JPG, SVG · 5MB max</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button type="submit" disabled={updateMutation.isPending} style={{
              display:'flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:12,
              background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff',
              border:'none', fontWeight:800, fontSize:14, cursor:'pointer',
              boxShadow:`0 4px 16px ${D.blue}40`, fontFamily:'DM Sans,sans-serif',
              opacity: updateMutation.isPending ? 0.7 : 1,
            }}>
              <Save size={16}/>{updateMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      )}

      {/* ══ PRINTER ══ */}
      {activeTab === 'printer' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <Printer size={16} color={D.blue} />
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>{t('settings.printerConnectionType')}</h3>
            </div>
            <p style={{ color:D.muted, fontSize:12, marginBottom:20 }}>{t('settings.printerDesc')}</p>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {PRINTER_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setPrinterConn(opt.value)} style={{
                  display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:14, cursor:'pointer',
                  border:`2px solid ${printerConn===opt.value ? opt.color : D.border}`,
                  background: printerConn===opt.value ? opt.bg : '#F8F9FF',
                  transition:'all 0.2s', textAlign:'left', width:'100%', fontFamily:'DM Sans,sans-serif',
                }}>
                  <div style={{ width:48, height:48, borderRadius:12, flexShrink:0, background:printerConn===opt.value?opt.color:D.blueDim2, display:'flex', alignItems:'center', justifyContent:'center', color:printerConn===opt.value?'#fff':D.muted, transition:'all 0.2s' }}>
                    {opt.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:800, fontSize:14, color:printerConn===opt.value?opt.color:D.text, margin:'0 0 3px' }}>{opt.label}</p>
                    <p style={{ fontSize:12, color:D.muted, margin:0 }}>{opt.desc}</p>
                  </div>
                  <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, border:`2px solid ${printerConn===opt.value?opt.color:D.border}`, background:printerConn===opt.value?opt.color:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                    {printerConn===opt.value && <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff' }} />}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginTop:20, display:'flex', justifyContent:'flex-end' }}>
              <button type="button"
                disabled={printerMutation.isPending || printerConn===settings?.printerConnection}
                onClick={() => printerMutation.mutate(printerConn)}
                style={{
                  display:'flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:12,
                  background:(printerMutation.isPending||printerConn===settings?.printerConnection)?'#ccc':`linear-gradient(135deg,${D.blue},${D.blueLt})`,
                  color:'#fff', border:'none', fontWeight:800, fontSize:14,
                  cursor:(printerMutation.isPending||printerConn===settings?.printerConnection)?'not-allowed':'pointer',
                  fontFamily:'DM Sans,sans-serif',
                }}>
                <Save size={16}/>{printerMutation.isPending ? t('common.saving') : t('settings.saveConnection')}
              </button>
            </div>
          </div>

          <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>{t('settings.printerHowTo')}</h3>
            {printerConn === 'bluetooth' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[t('settings.bt.step1'),t('settings.bt.step2'),t('settings.bt.step3'),t('settings.bt.step4')].map((step,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(37,99,235,0.1)', color:'#2563EB', fontWeight:900, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    <p style={{ fontSize:13, color:D.text, margin:0, lineHeight:1.5 }}>{step}</p>
                  </div>
                ))}
              </div>
            )}
            {printerConn === 'usb' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[t('settings.usb.step1'),t('settings.usb.step2'),t('settings.usb.step3'),t('settings.usb.step4')].map((step,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(5,150,105,0.1)', color:'#059669', fontWeight:900, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    <p style={{ fontSize:13, color:D.text, margin:0, lineHeight:1.5 }}>{step}</p>
                  </div>
                ))}
              </div>
            )}
            {printerConn === 'wifi' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[t('settings.wifi.step1'),t('settings.wifi.step2'),t('settings.wifi.step3'),t('settings.wifi.step4')].map((step,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(124,58,237,0.1)', color:'#7C3AED', fontWeight:900, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                    <p style={{ fontSize:13, color:D.text, margin:0, lineHeight:1.5 }}>{step}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAUX & DEVISE ══ */}
      {activeTab === 'currency' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <ArrowUpDown size={16} color={D.blue} />
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>{t('settings.exchangeRateTitle')}</h3>
            </div>
            <p style={{ color:D.muted, fontSize:12, marginBottom:20 }}>{t('settings.exchangeRateDesc')}</p>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {CURRENCIES.map(cur => {
                const currentRate = Number(rates[cur.value] || 0)
                const isVisible   = showRates[cur.value]
                return (
                  <div key={cur.value} style={{ borderRadius:14, border:`2px solid ${isVisible?D.border:'#e2e8f0'}`, background:isVisible?'#fafbff':'#f8f9ff', overflow:'hidden', transition:'all 0.2s', opacity:isVisible?1:0.7 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:isVisible?`1px solid ${D.border}`:'none' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:24 }}>{cur.flag}</span>
                        <div>
                          <p style={{ fontWeight:800, fontSize:14, color:D.text, margin:'0 0 1px' }}>{cur.value}</p>
                          <p style={{ fontSize:11, color:D.muted, margin:0 }}>{cur.label.split(' — ')[1]}</p>
                        </div>
                        {currentRate > 0 && (
                          <div style={{ padding:'3px 10px', borderRadius:20, background:D.blueDim2, fontSize:11, fontFamily:'monospace', fontWeight:700, color:D.blue }}>
                            1 {cur.value} = {currentRate.toFixed(2)} HTG
                          </div>
                        )}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {isVisible ? <Eye size={14} color={D.blue}/> : <EyeOff size={14} color={D.muted}/>}
                          <span style={{ fontSize:11, fontWeight:700, color:isVisible?D.blue:D.muted }}>
                            {isVisible ? t('settings.showOnReceipt') : t('settings.hideOnReceipt')}
                          </span>
                        </div>
                        <Toggle checked={isVisible} onChange={val => handleToggleVisibility(cur.value, val)} color={D.blue} />
                      </div>
                    </div>
                    <div style={{ padding:'14px 18px', display:'flex', gap:10, alignItems:'flex-end' }}>
                      <div style={{ flex:1 }}>
                        <label style={{ display:'block', color:D.muted, fontSize:11, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>
                          1 {cur.value} = ? HTG
                        </label>
                        <input
                          type="number" step="0.01" min="0.01"
                          placeholder={currentRate>0 ? currentRate.toFixed(2) : `${t('settings.eg')}: ${cur.value==='USD'?'132.00':cur.value==='DOP'?'2.28':cur.value==='EUR'?'143.00':'96.00'}`}
                          value={rates[cur.value] || ''}
                          onChange={e => setRates(r => ({ ...r, [cur.value]: e.target.value }))}
                          style={{ ...inp, fontFamily:'monospace', fontSize:15 }}
                          onFocus={e=>e.target.style.borderColor=D.blue}
                          onBlur={e=>e.target.style.borderColor=D.border}
                        />
                      </div>
                      <button type="button"
                        disabled={!rates[cur.value] || rateMutation.isPending}
                        onClick={() => {
                          const r = Number(rates[cur.value])
                          if (!r || r <= 0) return toast.error(t('settings.invalidRate'))
                          rateMutation.mutate({ currency: cur.value, rate: r })
                        }}
                        style={{
                          display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:10,
                          background:!rates[cur.value]?'#e2e8f0':`linear-gradient(135deg,${D.gold},${D.goldDk})`,
                          color:!rates[cur.value]?D.muted:'#fff',
                          border:'none', fontWeight:800, fontSize:12,
                          cursor:!rates[cur.value]?'not-allowed':'pointer',
                          fontFamily:'DM Sans,sans-serif', whiteSpace:'nowrap', height:42, transition:'all 0.2s',
                        }}>
                        <RefreshCw size={13}/>{t('common.update')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
            <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:'0 0 16px' }}>{t('settings.autoConversion')}</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {CURRENCIES.filter(c => Number(rates[c.value]) > 0).map(cur => {
                const rate = Number(rates[cur.value])
                return (
                  <div key={cur.value} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', background:D.blueDim, borderRadius:12, border:`1px solid ${D.border}` }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:D.blue, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:10, flexShrink:0 }}>{cur.value}</div>
                    <div>
                      <p style={{ fontWeight:700, color:D.blue, fontSize:13, margin:'0 0 4px' }}>{cur.flag} {cur.label}</p>
                      <p style={{ fontSize:12, color:D.muted, margin:0 }}>
                        100 {cur.value} = {(100*rate).toLocaleString('fr-HT',{minimumFractionDigits:2})} HTG &nbsp;|&nbsp; 10,000 HTG = {(10000/rate).toFixed(2)} {cur.value}
                      </p>
                    </div>
                  </div>
                )
              })}
              {CURRENCIES.every(c => !Number(rates[c.value])) && (
                <p style={{ color:D.muted, fontSize:13, textAlign:'center', padding:20 }}>{t('settings.noRates')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ ITILIZATÈ ══ */}
      {activeTab === 'users' && (
        <div style={{ background:D.white, borderRadius:16, padding:24, border:`1px solid ${D.border}`, boxShadow:D.shadow }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Users size={16} color={D.blue} />
              <h3 style={{ color:D.text, fontSize:14, fontWeight:800, margin:0 }}>{t('settings.userManagement')}</h3>
            </div>
            <Link to="/app/settings/users" style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, textDecoration:'none', background:`linear-gradient(135deg,${D.blue},${D.blueLt})`, color:'#fff', fontWeight:700, fontSize:12, boxShadow:`0 3px 12px ${D.blue}35` }}>
              <Users size={13}/> {t('settings.manageUsers')}
            </Link>
          </div>
          <p style={{ color:D.muted, fontSize:13, marginBottom:16 }}>{t('settings.usersDesc')}</p>
          {settings?.plan && (
            <div style={{ padding:'12px 16px', background:D.blueDim, border:`1px solid ${D.border}`, borderRadius:12, fontSize:13, color:D.blue, fontWeight:600 }}>
              {t('settings.planAllows', { plan: settings.plan.name, max: settings.plan.maxUsers })}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
