// src/pages/dashboard/DashboardRouter.jsx
// ✅ NOUVO — Chwazi ki "tableau de bò" pou montre lè moun ouvri /app/dashboard:
// si tenant a sèlman gen YON SÈL modil biznis (Hotel, Restoran, Gym, Prese)
// aktive, se dashboard modil sa a ki parèt kòm tableau de bò jeneral la —
// paske pou tenant sa, se SÈL biznis li genyen. Si li gen 0 oswa plizyè modil
// aktive, rete sou Dashboard Stock/POS jeneral la (konpòtman aktyèl la).
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import Dashboard from './Dashboard'

// Chak antre se yon modil ki gen pwòp "dashboard" pa li.
// Pa mete 'sabotay'/'mobilpay'/'kane' elatriye la — se adisyon anndan
// biznis prensipal la, se pa yon modil endepandan ak pwòp tableau de bò.
const SOLO_MODULES = [
  { key: 'hotel',      path: '/app/hotel'             },
  { key: 'restaurant', path: '/app/restaurant/tables' },
  { key: 'gym',        path: '/app/gym'               },
  { key: 'dry',        path: '/app/dry'               },
]

export default function DashboardRouter() {
  const { tenant } = useAuthStore()
  const allowedPages = tenant?.allowedPages || {}

  const activeModules = SOLO_MODULES.filter(m => allowedPages[m.key] === true)

  // ✅ Si se SÈL yon modil ki aktive (pa gen 2 oswa plis), se li ki vin
  // tableau de bò prensipal la.
  if (activeModules.length === 1) {
    return <Navigate to={activeModules[0].path} replace />
  }

  // Okenn modil espesyal aktive, oswa plizyè → tableau de bò jeneral
  // (Stock/POS), ki rete fidèl ak konpòtman aktyèl la.
  return <Dashboard />
}
