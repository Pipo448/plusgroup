// src/services/lotteryAgentApi.js
// Koneksyon Espas Ajan PlusGroup → pwogram "Ajan Plus Lotterie" (backend lotri a, sql/032).
// Kont lotri a separe (pwòp token li), men ajan an konekte l YON SÈL FWA isit la
// epi li wè toude pwogram yo sou menm paj la.
export const LOTTERY_API = (import.meta.env.VITE_LOTTERY_API_URL || 'https://plusgroup-lottery-api.onrender.com/api/v1').replace(/\/$/, '')
export const LOTTERY_SITE = (import.meta.env.VITE_LOTTERY_SITE_URL || 'https://pluslotterie.com').replace(/\/$/, '')
const KEY = 'pg-agent-lottery'

export const getLotterySession = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
export const setLotterySession = (v) => {
  try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY) } catch { /* */ }
}

async function call(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const tok = getLotterySession()?.token
    if (!tok) { const e = new Error('Konekte kont Plus Lotterie ou.'); e.status = 401; throw e }
    headers.Authorization = `Bearer ${tok}`
  }
  const res = await fetch(`${LOTTERY_API}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  let data = null
  try { data = await res.json() } catch { data = null }
  if (!res.ok) {
    const e = new Error((data && (Array.isArray(data.message) ? data.message[0] : data.message)) || `Erè ${res.status}`)
    e.status = res.status
    if (res.status === 401 && auth) setLotterySession(null)
    throw e
  }
  return data
}

export const lotteryAgentApi = {
  async login(identifier, password) {
    const r = await call('/public/agents/login', { method: 'POST', body: { identifier, password } })
    setLotterySession(r.data); return r.data
  },
  async register(body) {
    const r = await call('/public/agents/register', { method: 'POST', body })
    setLotterySession(r.data); return r.data
  },
  logout: () => setLotterySession(null),
  programs: () => call('/public/agents/programs').then((r) => r?.data || []),
  me: () => call('/ref-agent/me', { auth: true }).then((r) => r.data),
  join: (slug) => call(`/ref-agent/programs/${encodeURIComponent(slug)}/join`, { method: 'POST', auth: true }),
  payout: (slug, amount) => call('/ref-agent/payouts', { method: 'POST', auth: true, body: { slug, amount } }),
  // Ouvri espas lotri a san rekonekte (token nan "#", li pa janm ale sou sèvè a)
  spaceUrl: () => `${LOTTERY_SITE}/ajan/espas#t=${encodeURIComponent(getLotterySession()?.token || '')}`,
}
