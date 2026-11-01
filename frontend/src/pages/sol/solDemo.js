// src/pages/sol/solDemo.js
// ─── Kont DEMO (done fo, men byen kalkile) — pou nouvo moun teste app la ───
// Pa gen okenn rekèt rezo: dashboard la bati done sa yo nan navigatè a (token = 'demo').
// Dat yo kalkile relatif ak jodi a, kidonk demo a toujou sanble yon sòl reyèl k ap mache.

export const DEMO_TOKEN = 'demo'

const ymd = (d) => d.toISOString().slice(0, 10)
const addDays = (d, n) => { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x }

export function buildDemoData() {
  // jodi a nan lè Ayiti
  let todayStr
  try { todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Port-au-Prince' }).format(new Date()) } catch { todayStr = ymd(new Date()) }
  const today = new Date(`${todayStr}T00:00:00Z`)
  // dènye samdi (jodi a si se samdi)
  const lastSat = addDays(today, -((today.getUTCDay() + 1) % 7))
  const PAID = 6                       // 6 peman fèt (jiska dènye samdi a)
  const start = addDays(lastSat, -7 * (PAID - 1))
  const kinds = ['earlyDepo', 'early', 'onTime', 'early', 'onTime', 'onTime']
  const payments = {}, paymentTimings = {}
  for (let i = 0; i < PAID; i++) { const d = ymd(addDays(start, 7 * i)); payments[d] = true; paymentTimings[d] = kinds[i] }
  const payout = ymd(addDays(lastSat, 14))

  const member = {
    id: 'demo-m1', name: 'Demo Machann', phone: '+509 0000 0000', position: 4, accountPosition: 4, balance: 0,
    performanceScore: 82, declaredPayoutDate: payout, status: 'active',
    payments, paymentTimings,
    allSlots: [{ id: 'demo-m1', position: 4, payments, paymentTimings, declaredPayoutDate: payout }],
  }
  const plan = {
    id: 'demo-plan', name: 'Sòl Demo 500', amount: 500, fee: 0, frequency: 'weekly_saturday',
    maxMembers: 10, activeMemberCount: 10, totalMemberCount: 10, nonStoppedMemberCount: 10,
    dynamicPositioning: false, hidePositionInSol: false, stopPenaltyAmount: 0,
    createdAt: ymd(start), dueTime: '08:00', dueTimeEnd: '17:00', interval: 1, feePerMember: 0, penalty: 0,
    regleman: 'Sa a se yon DEMO ak done fo.\nNan yon vrè sòl, peman an fèt chak samdi avan 5è nan aprèmidi.',
  }
  return { tenant: { id: 'demo-t', name: 'Plus Group · Demo', businessName: 'Plus Group · Demo' }, member, plan }
}
