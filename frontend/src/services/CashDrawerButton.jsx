// src/components/pos/CashDrawerButton.jsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Archive, ChevronDown } from 'lucide-react'
import { usePrinter } from '../../hooks/usePrinter'

const C = {
  bg: '#0d1829', border: 'rgba(255,255,255,0.1)', text: '#e8eaf0', muted: '#6b7a99', gold: '#C9A84C',
}

export default function CashDrawerButton() {
  const { openCashDrawer, openCashDrawerSerial, isWebSerialSupported, drawerOpening } = usePrinter()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'flex' }}>
        <button
          onClick={() => { setShowMenu(false); openCashDrawer() }}
          disabled={drawerOpening}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px',
            borderRadius: '8px 0 0 8px', border: `1px solid ${C.border}`, borderRight: 'none',
            background: C.bg, color: C.text, cursor: drawerOpening ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          <Archive size={14} color={C.gold} />
          {drawerOpening ? 'Ap ouvri...' : 'Tiwa Kès'}
        </button>
        <button
          onClick={() => setShowMenu(v => !v)}
          style={{
            padding: '8px 8px', borderRadius: '0 8px 8px 0', border: `1px solid ${C.border}`,
            background: C.bg, color: C.muted, cursor: 'pointer',
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {showMenu && (
        <>
          <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute', top: '110%', right: 0, zIndex: 999, minWidth: 240,
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
            boxShadow: '0 10px 28px rgba(0,0,0,0.4)', overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: C.gold, borderBottom: `1px solid ${C.border}` }}>
              KIJAN TIWA A KONEKTE?
            </div>
            <button
              onClick={() => { setShowMenu(false); openCashDrawer() }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', fontSize: 13 }}
            >
              Konekte ak enprimant lan (kab kick-out) — pi komen
            </button>
            <button
              onClick={() => {
                setShowMenu(false)
                if (isWebSerialSupported()) openCashDrawerSerial()
                else toast.error('Navigatè sa a pa sipòte koneksyon USB/Sèryal dirèk. Itilize Chrome oswa Edge sou òdinatè.')
              }}
              style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', fontSize: 13, borderTop: `1px solid ${C.border}` }}
            >
              Konekte dirèkteman nan òdinatè a (USB/Sèryal)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
