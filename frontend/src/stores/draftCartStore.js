// src/stores/draftCartStore.js
// ══════════════════════════════════════════════════════════════
// PLUS GROUP — Depo santral pou "panye" pwodui yo (Fakti/Devi)
// Sa a pèmèt panye a rete vivan menm si itilizatè a chanje paj
// (egzanp: Pwodui → Fakti → tounen Pwodui pou ajoute yon lòt atik).
// Store la rete "an memwa" pandan tout sesyon an (li reyajiste si
// paj la refrechi nèt — sa nòmal, se konpòtman yon panye tanporè).
// ══════════════════════════════════════════════════════════════
import { create } from 'zustand'

const makeLine = (p) => ({
  id: `${p.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  description: p.name,
  productId: p.id,
  unitPrice: p.priceHtg || 0,
  qty: p.qty || 1,
  discount: 0,
  // ✅ Gade referans pwodui a konplè (foto, kòd, elt.) pou afichaj nan panye a —
  // paj Fakti/Devi yo pa oblije itilize l, yo itilize sèlman champ fakti yo anlè a.
  product: p,
})

export const useDraftCartStore = create((set, get) => ({
  // Liy fakti/devi yo (menm fòma ak `items` nan NewInvoicePage/QuoteForm)
  items: [],

  // ✅ Ajoute YON pwodui — si l deja la, ogmante kantite a olye double liy la
  addProduct: (p) => set(state => {
    const existing = state.items.find(it => it.productId === p.id)
    if (existing) {
      return {
        items: state.items.map(it =>
          it.productId === p.id ? { ...it, qty: Number(it.qty) + Number(p.qty || 1) } : it
        )
      }
    }
    return { items: [...state.items, makeLine(p)] }
  }),

  // ✅ Ajoute PLIZYÈ pwodui an menm tan (soti nan panye Pwodui a)
  addProducts: (products) => set(state => {
    const items = [...state.items]
    products.forEach(p => {
      const idx = items.findIndex(it => it.productId === p.id)
      if (idx !== -1) {
        items[idx] = { ...items[idx], qty: Number(items[idx].qty) + Number(p.qty || 1) }
      } else {
        items.push(makeLine(p))
      }
    })
    return { items }
  }),

  // ✅ Ranplase tout liy yo — itilize pandan itilizatè a ap modifye Qte/Pri/Rabè
  // dirèkteman nan paj Fakti/Devi a, pou store a rete senkwonize ak sa l wè a.
  setItems: (items) => set({ items }),

  // ✅ Konte total atik (sòm kantite yo) — sèvi pou detèmine si w ale nan
  // Fakti (≤5) oswa Devi (>5)
  getCount: () => get().items.reduce((sum, it) => sum + Number(it.qty || 0), 0),

  // ✅ Vide panye a nèt (apre yon fakti/devi kreye avèk siksè)
  clear: () => set({ items: [] }),
}))